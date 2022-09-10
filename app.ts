import http from "http";
import { Socket } from "net";
import { networkInterfaces } from "os";
import { Ip, Param, Query, Req, Get, HttpStatus, ContentType } from "./packages/core/Decorators/index";
import url from "url";
import NactCors from "./packages/other/Middleware/Cors/middleware";

import "reflect-metadata";

import { createSharedNactLogger, NactLogger } from "./packages/core/nact-logger/index";
import { NactRequest } from "./packages/core/nact-request/index";
import {
	CONTROLLER_ROUTER__NAME,
	CONTROLLER__WATERMARK,
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

import { NactRouteLibrary } from "./packages/core/index";

interface InjectRequest {
	url: string;
	headers: { [K: string]: string };
	method: "GET" | "POST" | "DELETE" | "OPTIONS" | "PUT";
	authority?: string;
}

export interface serverSettings {
	loggerEnabled?: boolean;
}

export interface NactRouteResponse {
	body: any;
	status?: number;
	contentType?: string;
}

export const getControllerPath = (instance: any): string | null => {
	return Reflect.getOwnMetadata(CONTROLLER_ROUTER__NAME, instance) ?? null;
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
	serverPort: number | null;
	RouteLibrary: NactRouteLibrary;
	IPv4: string | null;
	logger: NactLogger;
	middleware: any; //NactMiddleware;
	running: boolean;
	constructor(serverSetting?: serverSettings) {
		this.server = http.createServer(this.__RequestHandler);
		this.serverRunningURL = null;
		this.serverPort = null;
		this.logger = createSharedNactLogger({ isEnable: serverSetting?.loggerEnabled ?? true });
		this.RouteLibrary = new NactRouteLibrary(undefined, { logger: this.logger });
		this.IPv4 = null;
		this.middleware = [];
		this.running = false;

		this.__initialize();
	}

	// ===== Initilization =====
	protected async __initialize() {
		await getTransferModule().initialize();
		//eslint-disable-next-line

		const controllers = getTransferModule().getModulesControllers(true);
		this.RouteLibrary.regexpVariables.presets["test"] = "test";
		this.RouteLibrary.registerController(controllers);
		this.__getLocalMachineIP();

		this.__messageOnInitilizationEnd();
	}

	protected __messageOnInitilizationEnd() {
		if (this.running) {
			const protocol = "http://";
			const ipv4 = this.IPv4 ?? "localhost";
			const serverURL = protocol + ipv4 + ":" + this.serverPort + "/";
			this.serverRunningURL = serverURL;

			this.logger.log(`NactServer is now running on ${serverURL}`);
			this.logger.log("NactServer is successfully configured");
		}
	}

	// ---- Protected utils ----

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
		this.__executeRequest(request);
	};

	protected __executeRequest(request: NactRequest): any {
		let response = undefined;
		if (runMiddlewares(this.middleware, request)) {
			const routeMethod = this.RouteLibrary.getRouteMethodOr404(request);
			if (routeMethod) {
				response = routeMethod(request);
			}
			return request.send(response);
		}
	}

	// ==== Public ====

	get(): http.Server {
		return this.server;
	}

	listen(port: number) {
		if (!this.running) {
			this.server.listen(port, () => {
				this.running = true;
				this.serverPort = port;
			});
		}
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

	clearModuleConfiguration(cb: () => void): void {
		const transferModule = createNewTransferModule();
		this.RouteLibrary.clear();
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
		return new NactRequest(request, this.__executeRequest(nactRequest));
	}
}

@Controller("api")
class ApiController {
	constructor(private SomeTrashService: TestService3) {}

	@Get("delete?", ":hello(^hi2$)")
	Delete(@Param { hello }: any) {
		console.log(hello);
		return { message: "bye" };
	}

	@Get("/hello/:id(num)?")
	HelloWorld1() {
		return { message: "Hello world 1" };
	}

	@Get("/hello/:id(str)")
	HelloWorld2() {
		return { message: "Hello world 2" };
	}

	@Get("/")
	HelloWorld() {
		return { message: "Hello world" };
	}

	@Get("/:yes/hello/:id?")
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
	providers: [TestServiceModuleV1],
	import: [TestServiceModule3, TestService3],
});

createModule({
	controllers: [ApiController],
	providers: [
		TestService,
		createProvider({
			providerName: "test",
			useFactory: () => {
				return "test";
			},
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

App();

export default NactServer;
export { Controller };
