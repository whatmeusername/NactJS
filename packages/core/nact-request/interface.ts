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

export { NactUrlParseQuery, NactSendFileOption, NactResponseBody };
