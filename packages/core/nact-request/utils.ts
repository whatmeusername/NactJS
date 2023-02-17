import url from "url";
import type { IncomingMessage } from "http";
import type { NactServerResponse } from "./response";

interface NactUrlParseQuery extends Omit<url.UrlWithParsedQuery, "query"> {
	query: URLSearchParams;
	params: string[];
}

const splitURLParameters = (string: string): string[] => {
	if (string === "/") {
		return ["/"];
	}
	const splittedRes = string.split("/");
	return splittedRes.filter((param) => param !== "");
};

const getRequestURLInfo = (req: IncomingMessage): NactUrlParseQuery => {
	const fullUrl = getOrigin(req) + req.url;
	const parsedURLQuery = url.parse(fullUrl);
	const URL: NactUrlParseQuery = {
		...parsedURLQuery,
		query: new URLSearchParams(parsedURLQuery.search ?? ""),
		params: splitURLParameters(parsedURLQuery.pathname ?? "/"),
	};
	return URL;
};

const getOrigin = (req: IncomingMessage): string => {
	return getProtocol(req) + "://" + (req.headers.host ?? "");
};
const getProtocol = (req: IncomingMessage): "http" | "https" => {
	//@ts-ignore
	return req.socket.encrypted ? "https" : "http";
};

const getHost = (req: IncomingMessage): string | null => {
	return ((req.headers.host ?? req.headers.authority) as string) ?? null;
};

const getRequestIP = (req: IncomingMessage): string | null => {
	return req?.socket?.remoteAddress ?? null;
};

function isConnectionSecure(request: NactServerResponse) {
	//@ts-ignore
	return request?.socket?.encrypted === true || request.headers["x-forwarded-proto"] === "https";
}

export { getRequestURLInfo, splitURLParameters, getProtocol, getHost, getRequestIP, getOrigin, isConnectionSecure };
