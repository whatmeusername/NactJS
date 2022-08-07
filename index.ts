import http from 'http';
import { networkInterfaces } from 'os';
import { mime } from 'send';
import url from 'url';

import 'reflect-metadata';

import NactLogger from './logger';
import NactRequest from './request';
import { getPathSchema } from './utils/RoutingUtils';
import { getRequestURLInfo } from './utils/URLUtils';
import { CONTROLLER_ROUTES__NAME, ARG_TO_CALL_DESCRIPTOR_OPTIONS } from './router.const';

interface NactRoutes {
    [K: string]: NactRoute;
}

interface NactRoute {
    child: { [K: string]: RouteChild };
    absolute: string[];
    self: { new (): any };
}

export type ChildRouteSchema = Array<string | { name: string }>;

interface RouteChild {
    path: string;
    fullPath?: string;
    name: string;
    method: 'GET' | 'POST';
    absolute: boolean;
    schema: ChildRouteSchema;
    dynamicIndexes: number[];
}

interface serverSettings {
    controllers: { new (): any }[];
}

const getDescriptorPath = (descriptor: TypedPropertyDescriptor<any> | Function): string | null => {
    return Reflect.getOwnMetadata(CONTROLLER_ROUTES__NAME, descriptor) ?? null;
};

const isUppercase = (value: string): boolean => {
    return value[0] === value[0].toUpperCase();
};

const removeSlashes = (string: string): string => {
    if (string !== '/') {
        if (string[0] === '/') string = string.slice(1);
        if (string[string.length - 1] === '/') string = string.slice(0, string.length - 1);
    }
    return string;
};

const getContentType = (type: string): string => {
    return mime.lookup(type) || type;
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

const getRouteData = (
    path: string,
    target: Function,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>
): RouteChild => {
    const clearedPath = removeSlashes(path);
    const pathSchema = getPathSchema(clearedPath);
    let isAbsolute = false;

    const dynamicIndexes: number[] = [];
    pathSchema.forEach((seg, index) => {
        if (seg === null) {
            dynamicIndexes.push(index);
            isAbsolute = true;
        }
    });
    return {
        path: clearedPath,
        name: propertyKey,
        method: 'GET',
        absolute: isAbsolute,
        schema: pathSchema,
        dynamicIndexes: dynamicIndexes,
    };
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
            let IPv4 = en0[1].address;
            this.IPv4 = IPv4;
        }
    }

    protected __RequestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
        let request = new NactRequest(req);
        let result = this.executeRequest(request);
        if (result === undefined || result === null) {
            res.statusCode = 404;
            res.setHeader('Content-type', getContentType('txt'));
        } else {
            res.setHeader('Content-type', getContentType('txt'));
            res.write(result);
        }

        res.end();
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
    ByeWorldWithId(@Query query: URLSearchParams, @Param { yes, id }: any) {
        console.log('bye from dynamic');
        console.log(query, yes, id);
    }
}

function Controller(path: string): any {
    return function (target: Function) {
        Reflect.defineMetadata(CONTROLLER_ROUTES__NAME, path, target.prototype);

        return target;
    };
}

function getRouteParameters(route: RouteChild, params: string[], reg: NactRequest): any | null {
    let result = [];
    for (let i = 0; i < params.length; i++) {
        const param = params[i];
        if (param === 'query') {
            result.push(reg.urldata.query);
        } else if (param === 'param') {
            const routeParams: { [K: string]: any } = {};
            let regPathSchema = reg.urldata.params;
            regPathSchema = regPathSchema.slice(regPathSchema.length - route.schema.length);
            for (let i = 0; i < regPathSchema.length; i++) {
                let param = regPathSchema[i];
                let routeParam = route.schema[i];
                if (typeof routeParam === 'object') {
                    routeParams[routeParam.name] = param;
                }
            }
            result.push(routeParams);
        }
    }
    return result;
}

function Get(path: string): any {
    return function (
        target: Function,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<any>
    ): TypedPropertyDescriptor<any> {
        let descriptorMethod = descriptor.value as Function;
        descriptor.value = function (isDescriptorCall?: string, request?: NactRequest) {
            const routeData = getRouteData(path, target, propertyKey, descriptor);
            if (isDescriptorCall === ARG_TO_CALL_DESCRIPTOR_OPTIONS) {
                return routeData;
            } else if (request) {
                let metaData = Reflect.getMetadataKeys(target.constructor, propertyKey);
                let routeMetadata = Reflect.getMetadata(metaData[0], target.constructor, propertyKey);
                let methodParamsVariables: any[] = [];

                if (routeMetadata) {
                    let methodParams = routeMetadata?.params ?? [];
                    methodParamsVariables = getRouteParameters(routeData, methodParams, request);
                }

                return descriptorMethod.apply(this, [...methodParamsVariables]);
            }
        };
        return descriptor;
    };
}

function setRouteMetaData(target: any, routeKey: string, key: string, value: string): any {
    let currentMetaData = Reflect.getMetadata('route__metadata', target.constructor, routeKey);
    if (currentMetaData) {
        let propertyExists = currentMetaData[key];
        if (propertyExists) {
            currentMetaData[key].unshift(value);
        } else {
            currentMetaData[key] = [value];
        }
    } else {
        return { [key]: [value] };
    }
    return currentMetaData;
}

function setParameterValue(paramKey: string) {
    return function (target: any, key: string): any {
        Reflect.defineMetadata(
            'route__metadata',
            setRouteMetaData(target, key, 'params', paramKey),
            target.constructor,
            key
        );
    };
}

function Query(target: any, key: string, index: number): any {
    return setParameterValue('query')(target, key);
}

function Param(target: any, key: string, index: number) {
    return setParameterValue('param')(target, key);
}

const controllers = [ApiController];

function App() {
    const app = new NactServer({ controllers: controllers });

    app.listen(8000);
}

App();
