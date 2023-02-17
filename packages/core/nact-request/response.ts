import { ServerResponse } from "http";
import { lookup } from "mime";
import { HTTP_STATUS_CODES } from "../nact-constants";
import { serializeCookie } from "./CookieSerializator";

import type { NactRequest } from "./ctx";
import type { cookieOptions } from "./interface";
import type { IncomingMessage } from "http";

class NactServerResponse extends ServerResponse {
	private ctx?: NactRequest | undefined;

	constructor(req: IncomingMessage) {
		super(req);
		this.ctx = undefined;
	}

	set __ctx(ctx: NactRequest | undefined) {
		if (!this.ctx) {
			this.ctx = ctx;
		}
	}

	get __ctx(): NactRequest | undefined {
		return this.ctx;
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
				if (typeof data === "object" && data !== null && data !== undefined) {
					return this.json(data);
				} else {
					const stringifyData = JSON.stringify(data);
					this.length(Buffer.from(stringifyData).byteLength);
					this.write(stringifyData);
					this.ctx?.setPayload(data);
					return this.end();
				}
			} else if (this.ctx?.getHandlerData()) {
				this.status(HTTP_STATUS_CODES.NO_CONTENT);
			}

			return this.end(data ? data : null);
		}
		return this;
	}

	contentType(type: string): NactServerResponse {
		if (!this.isSended()) {
			const mimeType = lookup(type) || type;
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

	clearCookie(name: string, options?: cookieOptions): NactServerResponse {
		this.cookie(name, "", { expires: new Date(0), path: "/", ...options });
		return this;
	}

	cookie(cookieName: string, cookieValue: string, options?: cookieOptions): NactServerResponse {
		if (this.ctx) {
			options = !options ? {} : options;

			const request = this.ctx.getRequest();
			const response = this.ctx.getResponse();
			let setCookie = request.getHeader("Set-Cookie") ?? [];

			if (typeof setCookie === "string") {
				setCookie = [setCookie];
			}
			if (options?.removeOtherCookies) {
				response.removeHeader("Set-Cookie");
			} else {
				const responseCookie = response.getHeader("Set-Cookie") ?? [];
				if (typeof responseCookie !== "string" && Array.isArray(responseCookie))
					setCookie = [...setCookie, ...responseCookie];
				else setCookie.push(responseCookie as string);
			}

			if (!options?.path) {
				options.path = "/";
			}

			setCookie.push(serializeCookie(this.ctx, cookieName, cookieValue, options));
			response.header("Set-Cookie", setCookie);
		}

		return this;
	}
}

export { NactServerResponse };
