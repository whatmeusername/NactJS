import http from "http";
import { Socket } from "net";
import { networkInterfaces } from "os";
import { Ip, Param, Query, Req, Get, HttpStatus, ContentType } from "./packages/core/Decorators/index";
import url from "url";
import NactCors from "./packages/other/Middleware/Cors/middleware";

import { isUppercase } from "./packages/utils/Other";
import "reflect-metadata";

import { createSharedNactLogger, NactLogger } from "./packages/core/nact-logger/index";
import { NactRequest } from "./packages/core/nact-request/index";
import {
	CONTROLLER_ROUTER__NAME,
	CONTROLLER__WATERMARK,
	ROUTE__OPTIONS,
	HTTPContentType,
	HTTPStatusCodes,
} from "./packages/core/nact-constants/index";

import { createModule, createProvider, getTransferModule, createNewTransferModule } from "./packages/core/Module/index";

import {
	TestService,
	TestService3,
	TestServiceModule1,
	TestServiceModule2,
	TestServiceModule3,
	TestServiceModuleV1,
} from "./TemperaryFolder/TestServices";

import { TypeORMModule, TestEntity } from "./packages/other/rootModules/TypeOrmModule/module";

getTransferModule().useRootModule(
	TypeORMModule.root({
		type: "postgres",
		host: "localhost",
		port: 5432,
		username: "maksimmoiseev",
		password: "28092004",
		database: "test_backend",
		synchronize: true,
		autoLoadEntities: true,
		//migrationsRun: false,
		//entities: ["dist/**/*.entity{.ts,.js}"],
		//migrations: ["dist/**/migrations/**/*{.ts,.js}"],
		//logging: true,)
	}) as any
);

interface NactRoutes {
	[K: string]: NactRoute;
}

interface InjectRequest {
	url: string;
	headers: { [K: string]: string };
	method: "GET" | "POST" | "DELETE" | "OPTIONS" | "PUT";
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
	method: "GET" | "POST";
	absolute: boolean;
	schema: ChildRouteSchema;
	dynamicIndexes: number[];
}

export interface serverSettings {
	loggerEnabled?: boolean;
}

export interface NactRouteResponse {
	body: any;
	status?: number;
	contentType?: string;
}

const getControllerPath = (instance: any): string | null => {
	return Reflect.getOwnMetadata(CONTROLLER_ROUTER__NAME, instance) ?? null;
};

const findRouteByParams = (Router: NactRoute, params: ChildRouteSchema): RouteChild | null => {
	const routeChilds = Object.values(Router.child);
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
			const dseg = s1[i];
			const pathseg = s2[i];
			if (typeof dseg !== "object" && dseg !== pathseg) {
				return false;
			}
		}
		return true;
	}
	return false;
};

function runMiddlewares(middlewares: Array<(req: NactRequest) => void>, NactRequest: NactRequest): boolean {
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
	constructor(serverSetting?: serverSettings) {
		this.server = http.createServer(this.__RequestHandler);
		this.serverRunningURL = null;
		this.routes = {};
		this.logger = createSharedNactLogger({ isEnable: serverSetting?.loggerEnabled ?? true });
		this.IPv4 = null;
		this.middleware = [];

		getTransferModule().initialize();
		this.registerController(getTransferModule().getModulesControllers(true));
		this.__getLocalMachineIP();

		this.logger.log("NactServer is successfully configured");
	}

	get(): http.Server {
		return this.server;
	}

	listen(port: number) {
		this.server.listen(port, () => {
			const protocol = "http://";
			const ipv4 = this.IPv4 ?? "localhost";
			const serverURL = protocol + ipv4 + ":" + port + "/";
			this.serverRunningURL = serverURL;
			this.logger.log(`NactServer is now running on ${serverURL}`);
		});
	}

	useMiddleware(middleware: (req: NactRequest) => void) {
		this.middleware.push(middleware);
		this.logger.info(
			`"${middleware.name ?? "NAME IS UNKNOWN"}" function is now used as global middleware`,
			"MIDDLEWARE"
		);
		return this;
	}

	resetConfiguration() {
		this.middleware = [];
	}

	protected __getLocalMachineIP(): void {
		const net = networkInterfaces();
		const en0 = net.en0;
		if (en0) {
			if (en0[1]) {
				const IPv4 = en0[1].address;
				this.IPv4 = IPv4;
			}
		}
	}

	protected __RequestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
		const request = new NactRequest(req, res);
		this.executeRequest(request);
	};

	__resolverRouteMethod(req: NactRequest): ((...args: any[]) => any[]) | undefined {
		const params = req.urldata.params;
		const firstParam = params[0];
		const Router = this.routes[firstParam];

		let absolutePath = params.join("/");
		let route: RouteChild | null = null;
		let routeMethod;

		if (Router) {
			if (params.length > 1) {
				// AT CURRENT STATE: Route is founded by path only, so we have to add METHOD SOON
				if (Router.absolute.includes(absolutePath)) route = Router.child[absolutePath];
				else route = findRouteByParams(Router, params);
			} else {
				absolutePath = firstParam + "//";
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
			const routeMethod = this.__resolverRouteMethod(request);
			if (routeMethod) {
				response = routeMethod(request);
			}
		}
		return request.send(response);
	}

	clearModuleConfiguration(cb: () => void): void {
		const transferModule = createNewTransferModule();
		this.routes = {};
		cb();
		transferModule.initialize();
	}

	injectRequest(RequestData: InjectRequest) {
		const URLdata = url.parse(RequestData.url);

		function getHTTPRequest(): http.IncomingMessage {
			function setURL(req: http.IncomingMessage) {
				req.url = URLdata.pathname + (URLdata.search ? URLdata.search : "");
			}

			function setHost(req: http.IncomingMessage) {
				req.headers.host = RequestData.headers.host || (RequestData?.authority ?? false) || (URLdata.host ?? "");
			}

			function setHttpVersion(req: http.IncomingMessage) {
				req.httpVersionMajor = 1;
				req.httpVersionMinor = 1;
				req.httpVersion = "1.1";
			}
			function setMethod(req: http.IncomingMessage) {
				req.method = RequestData.method ? RequestData.method.toUpperCase() : "GET";
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
				req.headers["user-agent"] = RequestData.headers["user-agent"] || "NactFakeRequest";
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

			const rawRequest = new http.IncomingMessage(new Socket());

			setURL(rawRequest);
			setHost(rawRequest);
			setHttpVersion(rawRequest);
			setMethod(rawRequest);
			setHeaders(rawRequest);
			setUserAgent(rawRequest);
			setRawHeaders(rawRequest);
			return rawRequest;
		}

		const request = getHTTPRequest();
		const response = new http.ServerResponse(request);
		const nactRequest = new NactRequest(request, response);
		return new NactRequest(request, this.executeRequest(nactRequest));
	}

	registerController(controllerClass: { new (): any }[]) {
		controllerClass.forEach((controller) => {
			const controllerConstructor = controller.constructor;
			const contorllerRoutePath = getControllerPath(controllerConstructor as any);
			if (contorllerRoutePath) {
				this.routes[contorllerRoutePath] = { child: {}, absolute: [], self: controller };
				const CurrentRoute = this.routes[contorllerRoutePath];

				const controllerDescriptors = Object.getOwnPropertyDescriptors(controllerConstructor.prototype);
				const contorllerDescriptorKeys = Object.keys(controllerDescriptors);
				const registeredRoutes: string[] = [];

				contorllerDescriptorKeys.forEach((descriptorKey) => {
					if (isUppercase(descriptorKey)) {
						const descriptorConstructor = controller.constructor;
						const routeParamters: RouteChild = Reflect.getMetadata(
							ROUTE__OPTIONS,
							descriptorConstructor,
							descriptorKey
						);
						if (routeParamters) {
							routeParamters.schema.unshift(contorllerRoutePath as string);

							const absolutePath = contorllerRoutePath + "/" + routeParamters.path;
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

							registeredRoutes.push(descriptorKey);
						}
					}
				});
				this.logger.log(
					`successfully registered "${
						controllerConstructor.name
					}" controller with routes methods with names: "${registeredRoutes.join(", ")}". Total: ${
						registeredRoutes.length
					} routes`
				);
			}
		});
	}
}

@Controller("api")
class ApiController {
	constructor(private SomeTrashService: TestService3) {}

	@Get("delete")
	Delete() {
		return { message: "bye" };
	}

	@Get("/")
	HelloWorld() {
		return "bye";
	}

	@Get("/:yes/hello/:id")
	@HttpStatus(HTTPStatusCodes.OK)
	@ContentType(HTTPContentType.text)
	//eslint-disable-next-line
	ByeWorldWithId(@Query query: URLSearchParams, @Param { yes, id }: any, @Req req: NactRequest, @Ip ip: string) {
		return { test: "id" };
	}
}

function Controller(path: string): any {
	return function (target: () => any) {
		Reflect.defineMetadata(CONTROLLER_ROUTER__NAME, path, target);
		Reflect.defineMetadata(CONTROLLER__WATERMARK, true, target);

		return target;
	};
}

createModule({
	controllers: [],
	providers: [TestServiceModule1, TestServiceModule2, TestServiceModule3],
	import: [TestService3],
	export: [TestServiceModule2, TestServiceModule3],
});

createModule({
	controllers: [],
	providers: [TypeORMModule.getRepositories([TestEntity]), TestServiceModuleV1],
	import: [TestServiceModule3, TestService3],
});

createModule({
	controllers: [ApiController],
	providers: [
		TestService,
		createProvider({
			providerName: "test",
			useFactory: (arg: any) => {
				return "test";
			},
			injectArguments: [{ provide: "TestService32", optional: true }],
		}),
		TestService3,
	],
	import: [TestServiceModule2],
	export: [TestService3, "test"],
});

function App() {
	const app = new NactServer();

	app.useMiddleware(NactCors({ allowedOrigin: "http://localhost:3000" }));

	app.listen(8000);
}

//console.clear();
App();

export default NactServer;
export { Controller };
