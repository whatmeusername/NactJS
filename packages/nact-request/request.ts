import { IncomingMessage, ServerResponse } from "http";
import { HTTPStatusCodes, HTTPContentType } from "../nact-constants/index";

import { mime } from "send";
import fs from "fs";

import { parse } from "path";
import { RouteChild } from "../../index";

import { getRequestURLInfo, getProtocol, getRequestIP, getHost, getOrigin } from "../utils/URLUtils";
import { getNactLogger, NactLogger } from "../nact-logger/logger";

import { NactUrlParseQuery, NactSendFileOption, NactResponseBody } from "./index";

const SendFileDefaultOption = {
	disableWarning: false,
};

class NactRequest {
	protected __raw: IncomingMessage;
	private response: ServerResponse;
	public readonly route: RouteChild | null;
	public closed: boolean;

	host: string | null;
	origin: string;
	method: string | null;
	ip: string | null;
	protocol: "http" | "https";
	urldata: NactUrlParseQuery;

	protected __logger: NactLogger;

	constructor(req: IncomingMessage, res: ServerResponse) {
		this.__raw = req;
		this.response = res;
		this.route = null;
		this.closed = false;
		this.host = getHost(req);
		this.origin = (this.getHeader("Origin") ?? getOrigin(req)) as string;
		this.method = this.__raw.method ?? null;
		this.ip = getRequestIP(req);
		this.protocol = getProtocol(req);
		this.urldata = getRequestURLInfo(req);

		this.__logger = getNactLogger() as NactLogger;
	}

	set __route(__route: any) {
		//@ts-ignore
		this.route = __route;
	}

	isClosed(): boolean {
		return (this.response.writableEnded && this.closed) || this.closed;
	}

	ContentType(type: string): NactRequest {
		const mimeType = mime.lookup(type) || type;
		if (!this.isClosed()) (this.response as ServerResponse).setHeader("Content-type", mimeType);

		return this;
	}

	status(code: number): NactRequest {
		if (!this.isClosed()) (this.response as ServerResponse).statusCode = code;
		return this;
	}

	getHeader(name: string): string | string[] | null {
		return this.__raw.headers[name] ?? null;
	}

	header(header: string, value: boolean | number | string | string[]): NactRequest {
		if (typeof value === "boolean") value = `${value}`;

		if (!this.isClosed()) {
			this.response?.setHeader(header, value);
		}
		return this;
	}

	length(length: number): NactRequest {
		if (!this.isClosed()) (this.response as ServerResponse).setHeader("Content-Length", length);
		return this;
	}

	end(data?: any): ServerResponse | undefined {
		if (!this.isClosed()) {
			this.closed = true;
			if (data) {
				const stringifyData = JSON.stringify(data);
				this.length(stringifyData.length);
				return this.response.end(stringifyData);
			} else return this.response.end();
		}
	}

	protected closeRequest(data?: any) {
		if (!this.isClosed()) {
			const response = this.end(data ? data : null);
			this.closed = true;

			return response;
		}
	}

	forbiddenRequest() {
		if (!this.isClosed()) {
			this.status(HTTPStatusCodes.FORBIDDEN).ContentType("txt");
			this.closeRequest();
		}
	}

	Request404() {
		if (!this.isClosed()) {
			this.ContentType("txt").status(HTTPStatusCodes.NOT_FOUND);
			this.closeRequest();
		}
	}

	getMimeType(value: any) {
		const valueType = typeof value;
		if (valueType === "object") return HTTPContentType.json;
		else if (valueType === "string" || valueType === "number") return HTTPContentType.text;
		return HTTPContentType.text;
	}

	send(data: any): ServerResponse | undefined {
		const response: NactResponseBody = { body: data?.body ?? null };

		this.ContentType(response.contentType ?? this.getMimeType(response.body));
		this.status(response.status ?? 200);

		return this.closeRequest(response.body) ?? this.response;
	}

	sendFile(path: string, options: NactSendFileOption = SendFileDefaultOption) {
		const isFileExists = fs.existsSync(path);
		if (isFileExists && !this.isClosed()) {
			let canStream = true;

			const fileProperties = parse(path);
			const fileExtension = fileProperties.ext.slice(1);

			const type: any = mime.lookup(fileExtension) || "text/plain";
			const stats = fs.statSync(path);

			if (options?.maxSize && options?.maxSize < stats.size) {
				canStream = false;
				this.forbiddenRequest();
				if (!options.disableWarning) {
					this.__logger.info(
						`Send file: "${fileProperties.base}" with size of ${stats.size} bytes exceeded limit of ${options?.maxSize} bytes. (Request was cancelled)`
					);
				}
			}
			if (options?.allowedExtensions) {
				if (Array.isArray(options.allowedExtensions) && !options.allowedExtensions.includes(fileExtension)) {
					canStream = false;
				} else if (options.allowedExtensions !== fileExtension) canStream = false;
				if (!canStream) {
					this.forbiddenRequest();
					if (!options.disableWarning) {
						this.__logger.info(
							`Send file: "${fileProperties.base}" with extention "${fileExtension}" not permitted by allowed ${
								Array.isArray(options.allowedExtensions) ? "extensions" : "extension"
							} "${options.allowedExtensions}". (Request was cancelled)`
						);
					}
				}
			}

			if (canStream) {
				const fileStream = fs.createReadStream(path);
				fileStream.on("open", () => {
					this.status(HTTPStatusCodes.OK).ContentType(type).length(stats.size);
					fileStream.pipe(this.response as ServerResponse);
				});
				fileStream.on("end", () => {
					this.closeRequest();
				});

				fileStream.on("error", () => {
					this.__logger.error(`Send file: Caught error while streaming file "${fileProperties.base}".`);
					this.closeRequest();
				});
			}
		} else {
			this.Request404();
		}
	}
}

export { NactRequest };
