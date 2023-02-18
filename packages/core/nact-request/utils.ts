import { parse } from "url";
import type { IncomingMessage } from "http";
import type { NactServerResponse } from "./response";
import type { NactUrlParseQuery } from "./interface";

const getRequestURLInfo = (req: IncomingMessage): NactUrlParseQuery => {
	const fullUrl = getOrigin(req) + req.url;
	const parsedURLQuery = parse(fullUrl);

	const pathname = parsedURLQuery.pathname ?? "";
	const URLParameters = pathname === "/" ? ["/"] : pathname.split("/").filter((param) => param);

	const URL: NactUrlParseQuery = {
		...parsedURLQuery,
		query: new URLSearchParams(parsedURLQuery.search ?? ""),
		params: URLParameters,
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

export { getRequestURLInfo, getProtocol, getHost, getRequestIP, getOrigin, isConnectionSecure };
