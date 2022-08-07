import http from 'http';
import { networkInterfaces } from 'os';
import { Ip, Param, Query, Req, Get, HttpStatus, ContentType } from './Decorators/index';
import { isUppercase } from './utils/Other';
import 'reflect-metadata';

import NactLogger from './logger';
import NactRequest from './request';
import HttpStatusCodes from './HttpStatusCodes.const';
import HTTPContentType from './HttpContentType.const';
import {
    CONTROLLER_ROUTES__NAME,
    ARG_TO_CALL_DESCRIPTOR_OPTIONS,
    ROUTE__STATUS__CODE,
    ROUTE__CONTENT__TYPE,
} from './router.const';

interface NactRoutes {
    [K: string]: NactRoute;
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
    controllers: { new (): any }[];
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

class NactServer {
    server: http.Server;
    routes: NactRoutes;
    IPv4: string | null;
    logger: NactLogger;
    constructor(serverSetting: serverSettings) {
        this.server = http.createServer(this.__RequestHandler);
        this.routes = {};
        this.logger = new NactLogger();
        this.IPv4 = null;

        this.registerController(serverSetting.controllers);
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
            this.logger.log(`NactServer is now running on ${protocol + ipv4 + ':' + port + '/'}`);
        });
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
        let request = new NactRequest(req, res);
        let result = this.executeRequest(request);

        request.sendFile(__dirname + '/static/image.jpg');
        // if (result === undefined || result === null) {
        //     res.statusCode = 404;
        //     res.setHeader('Content-type', getContentType('txt'));
        // } else {
        //     res.setHeader('Content-type', getContentType('txt'));
        //     res.write(result);
        // }

        // res.end();
    };

    __resolverRouteMethod(params: string[]): Function | undefined {
        let firstParam = params[0];
        let Router = this.routes[firstParam];
        let absolutePath = params.join('/');
        let route;
        let routeMethod;

        if (Router) {
            if (params.length > 1) {
                if (Router.absolute.includes(absolutePath)) {
                    route = Router.child[absolutePath];
                } else {
                    let route = findRouteByParams(Router, params);
                    if (route) {
                        //@ts-ignore
                        routeMethod = Router.self[route.name];
                    }
                }
            } else {
                absolutePath = firstParam + '//';
                if (Router.absolute.includes(absolutePath)) {
                    route = Router.child[absolutePath];
                }
            }
            if (route) {
                //@ts-ignore
                routeMethod = Router.self[route.name];
            }
        }
        return routeMethod;
    }

    executeRequest(req: NactRequest): any {
        let res;

        let routeMethod = this.__resolverRouteMethod(req.urldata.params);
        if (routeMethod) {
            res = routeMethod(null, req);
        }

        return res;
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
    Delete(@Query query: any) {
        console.log(query);
        return 'bye';
    }

    @Get('/')
    HelloWorld() {
        console.log('hi');
        return 'bye';
    }

    @Get('/bye/hello')
    ByeWorld() {
        console.log('bye');
    }

    @Get('/:yes/hello/:id')
    @HttpStatus(HttpStatusCodes.OK)
    @ContentType(HTTPContentType.text)
    ByeWorldWithId(@Query query: URLSearchParams, @Param { yes, id }: any, @Req req: NactRequest, @Ip ip: string) {
        //@ts-ignore
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

    app.listen(8000);
}

App();
