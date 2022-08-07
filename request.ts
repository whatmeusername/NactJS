import { IncomingMessage } from 'http';
import { UrlWithParsedQuery } from 'url';

import { getRequestURLInfo, getProtocol, getRequestIP, getHost } from './utils/URLUtils';

interface NactUrlParseQuery extends Omit<UrlWithParsedQuery, 'query'> {
    query: URLSearchParams;
    params: string[];
}

class NactRequest {
    protected __raw: IncomingMessage;
    host: string | null;
    ip: string | null;
    protocol: 'http' | 'https';
    urldata: NactUrlParseQuery;

    constructor(reg: IncomingMessage) {
        this.__raw = reg;
        this.host = getHost(reg);
        this.ip = getRequestIP(reg);
        this.protocol = getProtocol(reg);
        this.urldata = getRequestURLInfo(reg);
    }
}

export default NactRequest;
