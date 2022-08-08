import { IncomingMessage, ServerResponse } from 'http';
import HttpStatusCodes from './HttpStatusCodes.const';
import HTTPContentType from './HttpContentType.const';
import { UrlWithParsedQuery } from 'url';
import { mime } from 'send';
import fs from 'fs';

import { parse } from 'path';
import { RouteChild } from './index';

import { getRequestURLInfo, getProtocol, getRequestIP, getHost } from './utils/URLUtils';
import NactLogger from './logger';

interface NactUrlParseQuery extends Omit<UrlWithParsedQuery, 'query'> {
    query: URLSearchParams;
    params: string[];
}

interface NactSendFileOption {
    maxSize?: number;
    allowedExtensions?: string[] | string;
    disableWarning?: boolean;
}

const SendFileDefaultOption = {
    disableWarning: false,
};

class NactRequest {
    protected __raw: IncomingMessage;
    private response: ServerResponse | null;
    public readonly route: RouteChild | null;
    protected closed: boolean = false;

    host: string | null;
    ip: string | null;
    protocol: 'http' | 'https';
    urldata: NactUrlParseQuery;

    protected __logger: NactLogger;

    constructor(reg: IncomingMessage, res: ServerResponse) {
        this.__raw = reg;
        this.response = res;
        this.route = null;
        this.closed = false;
        this.host = getHost(reg);
        this.ip = getRequestIP(reg);
        this.protocol = getProtocol(reg);
        this.urldata = getRequestURLInfo(reg);

        this.__logger = new NactLogger();
    }

    set __route(__route: any) {
        //@ts-ignore
        this.route = __route;
    }

    ContentType(type: string): NactRequest {
        const mimeType = mime.lookup(type) || type;
        if (!this.closed) (this.response as ServerResponse).setHeader('Content-type', mimeType);

        return this;
    }

    status(code: number): NactRequest {
        if (!this.closed) (this.response as ServerResponse).statusCode = code;
        return this;
    }

    length(length: number): NactRequest {
        if (!this.closed) (this.response as ServerResponse).setHeader('Content-Length', length);
        return this;
    }

    end(data?: any) {
        if (this.response && !this.closed) {
            if (data) {
                this.response.end(data);
            }
            this.response.end();
        }
    }

    protected closeRequest(data?: any) {
        if (!this.closed) {
            this.closeRequest();
            this.closed = true;
            this.response = null;
        }
    }

    forbiddenRequest() {
        if (!this.closed) {
            this.status(HttpStatusCodes.FORBIDDEN).ContentType('txt');
            this.closeRequest();
        }
    }

    Request404() {
        if (!this.closed) {
            this.ContentType('txt').status(HttpStatusCodes.NOT_FOUND);
            this.closeRequest();
        }
    }

    getMimeType(value: any) {
        let valueType = typeof value;
        if (valueType === 'object') return HTTPContentType.json;
        else if (valueType === 'string' || valueType === 'number') return HTTPContentType.text;
    }

    sendFile(path: string, options: NactSendFileOption = SendFileDefaultOption) {
        const isFileExists = fs.existsSync(path);
        if (isFileExists && !this.closed) {
            let canStream = true;

            let fileProperties = parse(path);
            let fileExtension = fileProperties.ext.slice(1);

            let type: any = mime.lookup(fileExtension) || 'text/plain';
            let stats = fs.statSync(path);

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
                            `Send file: "${
                                fileProperties.base
                            }" with extention "${fileExtension}" not permitted by allowed ${
                                Array.isArray(options.allowedExtensions) ? 'extensions' : 'extension'
                            } "${options.allowedExtensions}". (Request was cancelled)`
                        );
                    }
                }
            }

            if (canStream) {
                let fileStream = fs.createReadStream(path);
                fileStream.on('open', () => {
                    this.status(HttpStatusCodes.OK).ContentType(type).length(stats.size);
                    fileStream.pipe(this.response as ServerResponse);
                });
                fileStream.on('end', () => {
                    this.closeRequest();
                });

                fileStream.on('error', () => {
                    this.__logger.error(`Send file: Caught error while streaming file "${fileProperties.base}".`);
                    this.closeRequest();
                });
            }
        } else {
            this.Request404();
        }
    }
}

export default NactRequest;
