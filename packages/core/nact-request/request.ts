import { IncomingMessage, ServerResponse } from "http";
import { HTTP_STATUS_CODES, RouteChild, getNactLogger, NactLogger, HTTPMethods } from "../index";

import { mime } from "send";
import fs from "fs";

import { parse } from "path";

import { getRequestURLInfo, getProtocol, getRequestIP, getHost, getOrigin } from "./utils";

import { NactUrlParseQuery, NactSendFileOption } from "./index";
import { Socket } from "net";

import { CookieSerializeOptions, serialize } from "cookie";
import { sign } from "cookie-signature";

const SendFileDefaultOption = {
	disableWarning: false,
};

interface cookieOptions extends Omit<CookieSerializeOptions, "secure"> {
	signed?: boolean;
	secure?: boolean | "auto";
	sameSite?: boolean | "lax" | "none" | "strict";
	expires?: Date | undefined;
}

class RouteHandlerData {
	private ControllerInstance: new (...args: any) => any;
	private routeClass: object;
	private routeMethod: ((...args: any[]) => any) | undefined;
	private routeData: RouteChild;
	private routeArgs: any[];

	constructor(rc: new (...args: any) => any, rm: ((...args: any[]) => any) | undefined, rd: RouteChild) {
		this.ControllerInstance = rc;
		this.routeClass = rc.constructor;
		this.routeMethod = rm;
		this.routeData = rd;
		this.routeArgs = [];
	}

	set __routeMethod(value: (...args: any[]) => any) {
		this.routeMethod = value;
	}

	set __routeArgs(value: any[]) {
		this.routeArgs = value;
	}

	callMethod(): any {
		if (this.routeMethod) {
			return this.routeMethod.apply(this.ControllerInstance, this.routeArgs);
		}
		return undefined;
	}

	getArgs(): any[] {
		return this.routeArgs;
	}

	getHandlerClass(): object {
		return this.routeClass;
	}

	getHandler(): ((...args: any[]) => any) | undefined {
		return this.routeMethod;
	}

	getRouteData(): RouteChild {
		return this.routeData;
	}
}

function isConnectionSecure(request: NactServerResponse) {
	//@ts-ignore
	return request?.socket?.encrypted === true || request.headers["x-forwarded-proto"] === "https";
}

class NactServerResponse extends ServerResponse {
	private ctx?: NactRequest | undefined;

	constructor(req: IncomingMessage) {
		super(req);
		this.ctx = undefined;
	}

	set __ctx(ctx: NactRequest) {
		if (!this.ctx) {
			this.ctx = ctx;
		}
	}

	getCtx(): NactRequest | undefined {
		return this.ctx;
	}

	isSended(): boolean {
		return this.writableEnded;
	}

	json(body: { [K: string]: any }): NactServerResponse {
		if (!this.isSended()) {
			const json = JSON.stringify(body);
			this.setHeader("Content-Type", "application/json; charset=utf-8");
			this.length(Buffer.from(json).byteLength);
			this.ctx?.setPayload(body);
			return this.end(json, "utf8");
		}
		return this;
	}

	send(data?: any): NactServerResponse {
		if (!this.isSended()) {
			if (data) {
				if (typeof data === "object") {
					return this.json(data);
				} else {
					const stringifyData = JSON.stringify(data);
					this.length(Buffer.from(stringifyData).byteLength);
					this.write(stringifyData);
					this.ctx?.setPayload(data);
					return this.end();
				}
			} else {
				this.status(HTTP_STATUS_CODES.NO_CONTENT);
			}

			return this.end(data ? data : null);
		}
		return this;
	}

	contentType(type: string): NactServerResponse {
		if (!this.isSended()) {
			const mimeType = mime.lookup(type) || type;
			this.setHeader("Content-type", mimeType);
		}

		return this;
	}

	status(code: number): NactServerResponse {
		if (!this.isSended()) this.statusCode = code;
		return this;
	}

	header(header: string, value: boolean | number | string | null | string[]): NactServerResponse {
		if (value !== null) {
			if (typeof value === "boolean") value = value.toString();
			if (!this.isSended()) {
				this.setHeader(header, value);
			}
		}
		return this;
	}

	length(length: number): NactServerResponse {
		if (!this.isSended()) this.setHeader("Content-Length", length);
		return this;
	}

	cookie(ctx: NactRequest, cookieName: string, cookieValue: string, options?: cookieOptions) {
		try {
			const request = ctx.getRequest();
			const response = ctx.getResponse();

			options = options ? options : {};
			if (options?.expires && Number.isInteger(options.expires)) {
				options.expires = new Date(options.expires);
			}

			if (options?.signed && request.secret) {
				cookieValue = sign(cookieValue, request.secret);
			}
			if (options?.secure === "auto") {
				if (isConnectionSecure(response)) {
					options.secure = true;
				} else {
					options.sameSite = "lax";
					options.secure = false;
				}
			}

			const serialized = serialize(cookieName, cookieValue, options as CookieSerializeOptions);
			let setCookie = request.getHeader("Set-Cookie");
			if (!setCookie) {
				response.header("Set-Cookie", serialized);
				return ctx;
			}

			if (typeof setCookie === "string") {
				setCookie = [setCookie];
			}

			setCookie.push(serialized);
			response.removeHeader("Set-Cookie");
			response.header("Set-Cookie", setCookie);
			return ctx;
		} catch (err) {
			console.log(err.message);
		}
	}
}

class NactIncomingMessage extends IncomingMessage {
	protected body: any;
	private ctx?: NactRequest | undefined;

	public secret: string | undefined | null;
	public cookies: { [K: string]: string } | undefined | null;
	public signedCookies: { [K: string]: string } | undefined | null;

	constructor(socket: Socket) {
		super(socket);

		this.body = undefined;
		this.ctx = undefined;

		this.on("data", (chunk: Buffer) => {
			if (chunk instanceof Buffer) {
				this.body = chunk.toString();
			} else {
				this.body = chunk;
			}
		});
	}

	set __ctx(ctx: NactRequest) {
		if (!this.ctx) {
			this.ctx = ctx;
		}
	}

	getBody(): any {
		return this.body;
	}

	getHeader(name: string): string | string[] | null {
		return this.headers[name] ?? null;
	}
}

class NactRequest {
	private request: NactIncomingMessage;
	private response: NactServerResponse;
	protected readonly handler: RouteHandlerData | null;

	private host: string | null;
	private origin: string;
	private method: HTTPMethods | string | null;
	private ip: string | null;
	private protocol: "http" | "https";
	private urldata: NactUrlParseQuery;
	private payload: any;

	protected __logger: NactLogger;

	constructor(req: NactIncomingMessage, res: NactServerResponse) {
		this.request = req;
		this.response = res;
		this.handler = null;
		this.host = getHost(req);
		this.origin = (req.getHeader("Origin") ?? getOrigin(req)) as string;
		this.method = (req.method as HTTPMethods) ?? null;
		this.ip = getRequestIP(req);
		this.protocol = getProtocol(req);
		this.urldata = getRequestURLInfo(req);
		this.payload = null;

		this.__logger = getNactLogger() as NactLogger;

		this.request.__ctx = this;
		this.response.__ctx = this;
	}

	set __handler(__handler: RouteHandlerData) {
		//@ts-ignore
		this.handler = __handler;
	}

	// ---- getters ----

	getHandlerClass(): object | undefined {
		return this.handler?.getHandlerClass();
	}

	getHandler(): ((...args: any[]) => any) | undefined {
		return this.handler?.getHandler();
	}

	getHandlerData(): RouteHandlerData | null {
		return this.handler;
	}

	getRouteData(): RouteChild | undefined {
		return this.handler?.getRouteData();
	}

	getPayload(): any | undefined {
		return this.payload;
	}

	getURLData(): NactUrlParseQuery {
		return this.urldata;
	}

	getRequest(): NactIncomingMessage {
		return this.request;
	}

	getResponse(): NactServerResponse {
		return this.response;
	}

	getProtocol(): string {
		return this.protocol;
	}

	getMethod(): string | null {
		return this.method;
	}

	getHost(): string | null {
		return this.host;
	}

	getOrigin(): string | null {
		return this.origin;
	}

	getIP(): string | null {
		return this.ip;
	}

	// ---- Setters -----

	setPayload(payload: any): any {
		this.payload = payload;
		return this.payload;
	}

	// ==== Utils =====

	isSended(): boolean {
		return this.response.writableEnded;
	}

	send(): NactRequest {
		if (!this.response.isSended()) {
			this.response.send(this.payload);
		}
		return this;
	}

	sendFile(path: string, options: NactSendFileOption = SendFileDefaultOption) {
		const isFileExists = fs.existsSync(path);
		const response = this.getResponse();
		if (isFileExists && !this.isSended()) {
			let canStream = true;

			const fileProperties = parse(path);
			const fileExtension = fileProperties.ext.slice(1);

			const type: any = mime.lookup(fileExtension) || "text/plain";
			const stats = fs.statSync(path);

			if (options?.maxSize && options?.maxSize < stats.size) {
				canStream = false;
				//this.forbiddenRequest();
				if (!options.disableWarning) {
					this.__logger.info(
						`Send file: "${fileProperties.base}" with size of ${stats.size} bytes exceeded limit of ${options?.maxSize} bytes. (Request was cancelled)`,
					);
				}
			}
			if (options?.allowedExtensions) {
				if (Array.isArray(options.allowedExtensions) && !options.allowedExtensions.includes(fileExtension)) {
					canStream = false;
				} else if (options.allowedExtensions !== fileExtension) canStream = false;
				if (!canStream) {
					//this.forbiddenRequest();
					if (!options.disableWarning) {
						this.__logger.info(
							`Send file: "${fileProperties.base}" with extention "${fileExtension}" not permitted by allowed ${
								Array.isArray(options.allowedExtensions) ? "extensions" : "extension"
							} "${options.allowedExtensions}". (Request was cancelled)`,
						);
					}
				}
			}

			if (canStream) {
				const fileStream = fs.createReadStream(path);
				fileStream.on("open", () => {
					response.status(HTTP_STATUS_CODES.OK).contentType(type).length(stats.size);
					fileStream.pipe(this.response as ServerResponse);
				});
				fileStream.on("end", () => {
					response.end();
				});

				fileStream.on("error", () => {
					this.__logger.error(`Send file: Caught error while streaming file "${fileProperties.base}".`);
					response.end();
				});
			}
		} else {
			//this.Request404();
		}
	}
}

export { NactRequest, RouteHandlerData, NactServerResponse, NactIncomingMessage };
