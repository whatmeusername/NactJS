import { ServerResponse } from "http";
import { HTTP_STATUS_CODES, RouteChild, getNactLogger, NactLogger, HTTPMethods, RouteHandlerData } from "../index";

import { lookup } from "mime";
import fs from "fs";

import { parse } from "path";

import { getRequestURLInfo, getProtocol, getRequestIP, getHost, getOrigin } from "./utils";

import type { NactUrlParseQuery, NactSendFileOption, NactIncomingMessage, NactServerResponse } from "./index";

const SendFileDefaultOption = {
	disableWarning: false,
};

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
		this.response.__ctx = this;

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

	public getHandlerClass(): object | undefined {
		return this.handler?.getHandlerClass();
	}

	public getHandler(): ((...args: any[]) => any) | undefined {
		return this.handler?.getHandler();
	}

	public getHandlerData(): RouteHandlerData | null {
		return this.handler;
	}

	public getRouteData(): RouteChild | undefined {
		return this.handler?.getRouteData();
	}

	public getPayload(): any | undefined {
		return this.payload;
	}

	public getURLData(): NactUrlParseQuery {
		return this.urldata;
	}

	public getRequest(): NactIncomingMessage {
		return this.request;
	}

	public getResponse(): NactServerResponse {
		return this.response;
	}

	public getProtocol(): string {
		return this.protocol;
	}

	public getMethod(): string | null {
		return this.method;
	}

	public getHost(): string | null {
		return this.host;
	}

	public getOrigin(): string | null {
		return this.origin;
	}

	public getIP(): string | null {
		return this.ip;
	}

	// ---- Setters -----

	public setPayload(payload: any): any {
		this.payload = payload;
		return this.payload;
	}

	// ==== Utils =====

	public isSended(): boolean {
		return this.response.writableEnded;
	}

	public send(): NactRequest {
		if (!this.response.isSended()) {
			this.response.send(this.payload);
		}
		return this;
	}

	public sendFile(path: string, options: NactSendFileOption = SendFileDefaultOption) {
		const isFileExists = fs.existsSync(path);
		const response = this.getResponse();
		if (isFileExists && !this.isSended()) {
			let canStream = true;

			const fileProperties = parse(path);
			const fileExtension = fileProperties.ext.slice(1);

			const type: any = lookup(fileExtension) || "text/plain";
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

export { NactRequest };
