import url from 'url';
import type { IncomingMessage } from 'http';

interface NactUrlParseQuery extends Omit<url.UrlWithParsedQuery, 'query'> {
    query: URLSearchParams;
    params: string[];
}

const splitURLParameters = (string: string): string[] => {
    if (string === '/') {
        return ['/'];
    }
    let splittedRes = string.split('/');
    return splittedRes.filter((param) => param !== '');
};

const getRequestURLInfo = (req: IncomingMessage): NactUrlParseQuery => {
    const fullUrl = (req.headers.host ?? '') + req.url;
    let parsedURLQuery = url.parse(fullUrl);
    let URL: NactUrlParseQuery = {
        ...parsedURLQuery,
        query: new URLSearchParams(parsedURLQuery.search ?? ''),
        params: splitURLParameters(parsedURLQuery.pathname ?? '/'),
    };
    return URL;
};

const getProtocol = (req: IncomingMessage): 'http' | 'https' => {
    //@ts-ignore
    return req.socket.encrypted ? 'https' : 'http';
};

const getHost = (req: IncomingMessage): string | null => {
    return ((req.headers.host ?? req.headers.authority) as string) ?? null;
};

const getRequestIP = (req: IncomingMessage): string | null => {
    return req?.socket?.remoteAddress ?? null;
};

export { getRequestURLInfo, splitURLParameters, getProtocol, getHost, getRequestIP };
