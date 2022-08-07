import { IncomingMessage, ServerResponse } from 'http';
import { UrlWithParsedQuery } from 'url';
import { mime } from 'send';
import fs from 'fs';

import { parse } from 'path';

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
    private response: ServerResponse;
    host: string | null;
    ip: string | null;
    protocol: 'http' | 'https';
    urldata: NactUrlParseQuery;

    protected __logger: NactLogger;

    constructor(reg: IncomingMessage, res: ServerResponse) {
        this.__raw = reg;
        this.response = res;
        this.host = getHost(reg);
        this.ip = getRequestIP(reg);
        this.protocol = getProtocol(reg);
        this.urldata = getRequestURLInfo(reg);

        this.__logger = new NactLogger();
    }

    setContentType(type: string): NactRequest {
        const mimeType = mime.lookup(type) || type;
        this.response.setHeader('Content-type', mimeType);
        return this;
    }

    setStatusCode(code: number): NactRequest {
        this.response.statusCode = code;
        return this;
    }

    setContentLength(length: number): NactRequest {
        this.response.setHeader('Content-Length', length);
        return this;
    }
    end(data?: any) {
        if (data) {
            this.response.end(data);
        }
        this.response.end();
    }

    forbiddenRequest() {
        this.setStatusCode(403).setContentType('txt');
        this.end();
    }

    sendFile(path: string, options: NactSendFileOption = SendFileDefaultOption) {
        const isFileExists = fs.existsSync(path);
        if (isFileExists) {
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
                    this.setStatusCode(200).setContentType(type).setContentLength(stats.size);
                    fileStream.pipe(this.response);
                });
                fileStream.on('end', () => {
                    this.end();
                });

                fileStream.on('error', () => {
                    this.__logger.error(`Send file: Caught error while streaming file "${fileProperties.base}".`);
                    this.end();
                });
            }
        } else {
            this.setContentType('txt').setStatusCode(404);
            this.end();
        }
    }
}

export default NactRequest;
