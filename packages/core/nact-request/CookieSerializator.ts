import { serialize } from "cookie";
import { sign } from "cookie-signature";
import { cookieOptions } from "./interface";
import type { NactRequest } from "./ctx";
import type { CookieSerializeOptions } from "cookie";
import { isConnectionSecure } from "./utils";

function serializeCookie(ctx: NactRequest, cookieName: string, cookieValue: string, options?: cookieOptions): string {
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

		return serialize(cookieName, cookieValue, options as CookieSerializeOptions);
	} catch (Error) {
		throw new Error();
	}
}

export { serializeCookie };
