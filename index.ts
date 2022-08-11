import http from 'http';
import { Socket } from 'net';
import { networkInterfaces } from 'os';
import { Ip, Param, Query, Req, Get, HttpStatus, ContentType } from './Decorators/index';
import url from 'url';
import NactCors from './Middleware/Cors/index';

import { isUppercase } from './utils/Other';
import 'reflect-metadata';

import NactLogger from './logger';
import NactRequest from './request';
import HttpStatusCodes from './HttpStatusCodes.const';
import HTTPContentType from './HttpContentType.const';
import { getRequestURLInfo } from './utils/URLUtils';
import { CONTROLLER_ROUTES__NAME, ARG_TO_CALL_DESCRIPTOR_OPTIONS } from './router.const';

interface NactRoutes {
    [K: string]: NactRoute;
}

interface InjectRequest {
    url: string;
    headers: { [K: string]: string };
    method: 'GET' | 'POST' | 'DELETE' | 'OPTIONS' | 'PUT';
    authority?: string;
}

export interface NactRoute {
    child: { [K: string]: RouteChild };
    absolute: string[];
    self: { new (): any };
}

export type ChildRouteSchema = Array<string | { name: string }>;

export interface RouteChild {
    path: string;
    fullPath?: string;
    name: string;
    method: 'GET' | 'POST';
    absolute: boolean;
    schema: ChildRouteSchema;
    dynamicIndexes: number[];
}

export interface serverSettings {
    controllers?: { new (): any }[];
}

export interface NactRouteResponse {
    body: any;
    status?: number;
    contentType?: string;
}

const getDescriptorPath = (descriptor: TypedPropertyDescriptor<any> | Function): string | null => {
    return Reflect.getOwnMetadata(CONTROLLER_ROUTES__NAME, descriptor) ?? null;
};

const findRouteByParams = (Router: NactRoute, params: ChildRouteSchema): RouteChild | null => {
    let routeChilds = Object.values(Router.child);
    for (let i = 0; i < routeChilds.length; i++) {
        const route = routeChilds[i];
        const schema = route.schema;
        const mathcing = diffRouteSchemas(schema, params);
        if (mathcing) return route;
    }
    return null;
};

const diffRouteSchemas = (s1: ChildRouteSchema, s2: ChildRouteSchema): boolean => {
    if (s1.length === s2.length) {
        for (let i = 0; i < s1.length; i++) {
            let dseg = s1[i];
            let pathseg = s2[i];
            if (typeof dseg !== 'object' && dseg !== pathseg) {
                return false;
            }
        }
        return true;
    }
    return false;
};

function runMiddlewares(middlewares: Array<Function>, NactRequest: NactRequest): boolean {
    for (let i = 0; i < middlewares.length; i++) {
        if (!NactRequest.closed) {
            const middleware = middlewares[i];
            middleware(NactRequest);
        } else return false;
    }
    return true;
}

class NactServer {
    server: http.Server;
    serverRunningURL: string | null;
    routes: NactRoutes;
    IPv4: string | null;
    logger: NactLogger;
    middleware: any; //NactMiddleware;
    constructor(serverSetting: serverSettings) {
        this.server = http.createServer(this.__RequestHandler);
        this.serverRunningURL = null;
        this.routes = {};
        this.logger = new NactLogger();
        this.IPv4 = null;
        this.middleware = [];

        this.registerController(serverSetting?.controllers ?? []);
        this.__getLocalMachineIP();

        this.logger.log('NactServer is successfully configured');
    }

    get(): http.Server {
        return this.server;
    }

    listen(port: number) {
        this.server.listen(port, () => {
            const protocol = 'http://';
            const ipv4 = this.IPv4 ?? 'localhost';
            const serverURL = protocol + ipv4 + ':' + port + '/';
            this.serverRunningURL = serverURL;
            this.logger.log(`NactServer is now running on ${serverURL}`);
        });
    }

    useMiddleware(middleware: (req: NactRequest) => void) {
        this.middleware.push(middleware);
        this.logger.info(
            `"${middleware.name ?? 'NAME UNDEFINED'}" function is now used as global middleware`,
            'MIDDLEWARE'
        );
        return this;
    }

    protected __getLocalMachineIP(): void {
        const net = networkInterfaces();
        let en0 = net.en0;
        if (en0) {
            if (en0[1]) {
                let IPv4 = en0[1].address;
                this.IPv4 = IPv4;
            }
        }
    }

    protected __RequestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
        const request = new NactRequest(req, res);
        this.executeRequest(request);
    };

    __resolverRouteMethod(req: NactRequest): Function | undefined {
        const params = req.urldata.params;
        let firstParam = params[0];
        let Router = this.routes[firstParam];
        let absolutePath = params.join('/');
        let route: RouteChild | null = null;
        let routeMethod;

        if (Router) {
            if (params.length > 1) {
                if (Router.absolute.includes(absolutePath)) route = Router.child[absolutePath];
                else route = findRouteByParams(Router, params);
            } else {
                absolutePath = firstParam + '//';
                if (Router.absolute.includes(absolutePath)) route = Router.child[absolutePath];
            }
            if (route) {
                req.__route = route;
                //@ts-ignore
                routeMethod = Router.self[route.name];
            }
        }
        return routeMethod;
    }

    executeRequest(request: NactRequest): any {
        let response = undefined;
        if (runMiddlewares(this.middleware, request)) {
            let routeMethod = this.__resolverRouteMethod(request);
            if (routeMethod) {
                response = routeMethod(null, request);
            }
        }
        return request.send(response);
    }

    injectRequest(RequestData: InjectRequest) {
        const URLdata = url.parse(RequestData.url);

        function getHTTPRequest(): http.IncomingMessage {
            function setURL(req: http.IncomingMessage) {
                req.url = URLdata.pathname + (URLdata.search ? URLdata.search : '');
            }

            function setHost(req: http.IncomingMessage) {
                req.headers.host =
                    RequestData.headers.host || (RequestData?.authority ?? false) || (URLdata.host ?? '');
            }

            function setHttpVersion(req: http.IncomingMessage) {
                req.httpVersionMajor = 1;
                req.httpVersionMinor = 1;
                req.httpVersion = '1.1';
            }
            function setMethod(req: http.IncomingMessage) {
                req.method = RequestData.method ? RequestData.method.toUpperCase() : 'GET';
            }
            function setHeaders(req: http.IncomingMessage) {
                if (RequestData?.headers) {
                    const headersData = Object.entries(RequestData.headers);
                    for (let i = 0; i < headersData.length; i++) {
                        const header = headersData[i];
                        if (header[1] !== undefined && header[1] !== null) {
                            req.headers[header[0]] = header[1];
                        }
                    }
                }
            }
            function setUserAgent(req: http.IncomingMessage) {
                req.headers['user-agent'] = RequestData.headers['user-agent'] || 'NactFakeRequest';
            }

            function setRawHeaders(req: http.IncomingMessage) {
                const headersData = Object.entries(req.headers);
                for (let i = 0; i < headersData.length; i++) {
                    const [key, value] = headersData[i];
                    if (value !== undefined && value !== null) {
                        req.rawHeaders.push(key);
                        Array.isArray(value) ? req.rawHeaders.push(...value) : req.rawHeaders.push(value);
                    }
                }
            }

            let rawRequest = new http.IncomingMessage(new Socket());

            setURL(rawRequest);
            setHost(rawRequest);
            setHttpVersion(rawRequest);
            setMethod(rawRequest);
            setHeaders(rawRequest);
            setUserAgent(rawRequest);
            setRawHeaders(rawRequest);
            return rawRequest;
        }
        let request = getHTTPRequest();
        let response = new http.ServerResponse(request);
        const nactRequest = new NactRequest(request, response);
        return this.executeRequest(nactRequest);
    }

    registerController(controllerClass: { new (): any }[]) {
        controllerClass.forEach((controller) => {
            let contorllerRoute = getDescriptorPath(controller.prototype);
            if (contorllerRoute) {
                this.routes[contorllerRoute] = { child: {}, absolute: [], self: new controller() };
                let CurrentRoute = this.routes[contorllerRoute];

                const controllerDescriptors = Object.getOwnPropertyDescriptors(controller.prototype);
                const contorllerDescriptorKeys = Object.keys(controllerDescriptors);

                contorllerDescriptorKeys.forEach((descriptorKey) => {
                    if (isUppercase(descriptorKey)) {
                        let descriptor = controllerDescriptors[descriptorKey];
                        let routeParamters: RouteChild = descriptor.value(ARG_TO_CALL_DESCRIPTOR_OPTIONS) as RouteChild;

                        routeParamters.schema.unshift(contorllerRoute as string);
                        const absolutePath = contorllerRoute + '/' + routeParamters.path;
                        const isExists = findRouteByParams(CurrentRoute, routeParamters.schema) ? true : false;

                        if (isExists) {
                            if (routeParamters.absolute) {
                                this.logger.error(
                                    `Route with path "${routeParamters.path}" already exists in controller "${controller.name}"`
                                );
                            } else {
                                this.logger.error(
                                    `"${controller.name}" already have route pattern that looking like "${routeParamters.path}"`
                                );
                            }
                        }
                        CurrentRoute.child[absolutePath] = { ...routeParamters, fullPath: absolutePath };
                        if (routeParamters.absolute) {
                            CurrentRoute.absolute.push(absolutePath);
                        }
                    }
                });
                this.logger.log(`successfully registered "${controller.name}" controller`);
            }
        });
    }
}

@Controller('api')
class ApiController {
    constructor() {}

    @Get('delete')
    Delete() {
        return { message: 'bye' };
    }

    @Get('/')
    HelloWorld(test: any) {
        return 'bye';
    }

    @Get('/:yes/hello/:id')
    @HttpStatus(HttpStatusCodes.OK)
    @ContentType(HTTPContentType.text)
    ByeWorldWithId(@Query query: URLSearchParams, @Param { yes, id }: any, @Req req: NactRequest, @Ip ip: string) {
        return { test: 'id' };
    }
}

function Controller(path: string): any {
    return function (target: Function) {
        Reflect.defineMetadata(CONTROLLER_ROUTES__NAME, path, target.prototype);

        return target;
    };
}

const controllers = [ApiController];

function App() {
    const app = new NactServer({ controllers: controllers });

    app.useMiddleware(NactCors({ allowedOrigin: 'http://localhost:3000' }));

    app.listen(8000);
}

App();

export default NactServer;
export { Controller };
