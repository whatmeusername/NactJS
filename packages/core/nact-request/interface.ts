import type { CookieSerializeOptions } from "cookie";
import type { UrlWithParsedQuery } from "url";

interface NactUrlParseQuery extends Omit<UrlWithParsedQuery, "query"> {
	query: URLSearchParams;
	params: string[];
}

interface NactSendFileOption {
	maxSize?: number;
	allowedExtensions?: string[] | string;
	disableWarning?: boolean;
}

interface NactResponseBody {
	body: any;
	status?: number;
	contentType?: string;
	isNactResonse?: boolean;
}

interface cookieOptions extends Omit<CookieSerializeOptions, "secure"> {
	signed?: boolean;
	secure?: boolean | "auto";
	sameSite?: boolean | "lax" | "none" | "strict";
	expires?: Date | undefined;
	removeOtherCookies?: boolean;
}

export { NactUrlParseQuery, NactSendFileOption, NactResponseBody, cookieOptions };
