import "reflect-metadata";

import { createServer, IncomingMessage, RequestListener } from "http";
import type { Server } from "http";
import { parse } from "url";
import { networkInterfaces } from "os";
import { Socket } from "net";

import { createSharedNactLogger, NactLogger } from "../nact-logger/logger";
import { NactRouteLibrary } from "../routing/NactRouteLibary";
import { NactRequest, NactServerResponse, NactIncomingMessage } from "../nact-request";
import { createNewTransferModule, getTransferModule, NactTransferModule } from "../module";

import type { InjectRequest, serverSettings } from "./interface";
import { HttpExpectionHandler, BaseHttpExpectionHandler, HttpExpection } from "../expections";

function runMiddlewares(middlewares: Array<(req: NactRequest) => void>, NactRequest: NactRequest): boolean {
	for (let i = 0; i < middlewares.length; i++) {
		if (!NactRequest.isSended()) {
			const middleware = middlewares[i];
			middleware(NactRequest);
		} else return false;
	}
	return true;
}

type NactMiddleware = (req: NactRequest) => any;

class NactGlobalConfig {
	private middleware: NactMiddleware[];
	private handlers: any[];
	// handlers
	// guards
	// pipes
	//afterware
	constructor(private readonly server: NactServer) {
		this.middleware = [];
		this.handlers = [];
	}

	getGlobalMiddleware(): NactMiddleware[] {
		return this.middleware;
	}

	getHandlers(): HttpExpectionHandler[];
	getHandlers(name: string): HttpExpectionHandler | undefined;
	getHandlers(name?: string): HttpExpectionHandler | HttpExpectionHandler[] | undefined {
		if (name) {
			return this.handlers.find((handler) => handler.name === name);
		}
		return this.handlers;
	}

	addGlobalHandler(
		handler: (new (...args: any[]) => HttpExpectionHandler) | (new (...args: any[]) => HttpExpectionHandler)[],
	) {
		const coreModule = this.server.getTransferModule().getCoreModule();
		if (Array.isArray(handler)) {
			handler.forEach((handler) => {
				const provider = coreModule?.appendProvider(handler);
				if (provider?.instance) {
					this.handlers = [...this.handlers, ...provider.instance];
				}
			});
		} else {
			const provider = coreModule?.appendProvider(handler);
			if (provider?.instance) {
				this.handlers.unshift(provider.instance);
			}
		}
	}

	addGlobalMiddleware(middleware: NactMiddleware | NactMiddleware[]): void {
		if (Array.isArray(middleware)) {
			this.middleware = [...this.middleware, ...middleware];
		} else {
			this.middleware.push(middleware);
		}
	}
}

class NactServer {
	protected server: Server;
	private serverRunningURL: string | null;
	private serverPort: number | null;
	protected RouteLibrary: NactRouteLibrary;
	private IPv4: string | null;
	private logger: NactLogger;
	private GlobalConfig: NactGlobalConfig;
	private running: boolean;
	private transferModuleKey: string;

	constructor(transferModuleKey?: string, serverSetting?: serverSettings) {
		this.server = createServer(
			{ ServerResponse: NactServerResponse, IncomingMessage: NactIncomingMessage },
			this.__RequestHandler as RequestListener,
		);
		this.serverRunningURL = null;
		this.serverPort = null;
		this.logger = createSharedNactLogger({ isEnable: serverSetting?.loggerEnabled ?? true });
		this.RouteLibrary = new NactRouteLibrary(this, undefined, { logger: this.logger });
		this.IPv4 = null;
		this.GlobalConfig = new NactGlobalConfig(this);
		this.running = false;
		this.transferModuleKey = transferModuleKey ?? "0";

		this.__initialize();
	}

	// ---- Global ----

	public getGlobalConfig(): NactGlobalConfig {
		return this.GlobalConfig;
	}

	public useMiddleware(middleware: (req: NactRequest) => void) {
		this.GlobalConfig.addGlobalMiddleware(middleware);
		this.logger.info(`"${middleware.name ?? "NAME IS UNKNOWN"}" function is now used as global middleware`, "MIDDLEWARE");
		return this;
	}

	public useHandler(handler: new (...args: any[]) => HttpExpectionHandler) {
		this.GlobalConfig.addGlobalHandler(handler);
		return this;
	}

	// ==== Getters =====
	public getServerURL(): string | null {
		if (this.running) {
			return this.serverRunningURL;
		}
		return null;
	}

	public getServer(): Server {
		return this.server;
	}

	public getLogger(): NactLogger {
		return this.logger;
	}

	public getTransferModuleKey(): string {
		return this.transferModuleKey;
	}

	// ===== Initilization =====
	protected async __initialize() {
		this.useHandler(BaseHttpExpectionHandler);
		await this.getTransferModule().initialize();

		const controllers = this.getTransferModule().getModulesControllers(true);
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

	protected __RequestHandler = (req: NactIncomingMessage, res: NactServerResponse) => {
		const request = new NactRequest(req, res);
		request.getRequest().once("end", () => {
			this.__executeRequest(request);
		});
	};

	protected async __executeRequest(request: NactRequest): Promise<NactRequest | undefined> {
		let response = undefined;

		if (runMiddlewares(this.GlobalConfig.getGlobalMiddleware(), request)) {
			const HandlerRouter = this.RouteLibrary.getRouteMethodOr404(request);

			const handlerData = request.getHandlerData();
			if (HandlerRouter) {
				response = new Promise((resolve) => {
					return resolve(handlerData?.callMethod());
				});

				await response
					.then((res: any) => {
						request.setPayload(res);
					})
					.catch((err: any) => {
						const routeConfig = HandlerRouter.getControllerHandler();
						const isHandled = routeConfig.handle(err, request);

						if (!isHandled) {
							throw err;
						}
					});
			}
		}

		return request.send();
	}

	// ==== Public ====

	public getTransferModule(): NactTransferModule {
		return getTransferModule(this.transferModuleKey);
	}
	public get(): Server {
		return this.server;
	}

	public listen(port: number) {
		if (!this.running) {
			this.server.listen(port, () => {
				this.running = true;
				this.serverPort = port;
			});
		}
	}

	public resetConfiguration() {
		this.GlobalConfig = new NactGlobalConfig(this);
	}

	public async clearModuleConfiguration(
		cb?: (transferModuleKey: string, transferModule: NactTransferModule) => void,
	): Promise<void> {
		const transferModule = createNewTransferModule(this.transferModuleKey);
		this.RouteLibrary.clear();
		if (cb) cb(this.transferModuleKey, this.getTransferModule());

		await transferModule.initialize();

		const controllers = this.getTransferModule().getModulesControllers(true);
		this.RouteLibrary.registerController(controllers);
	}

	public async injectRequest(RequestData: InjectRequest) {
		RequestData.url = RequestData.url.toLowerCase();
		const URLdata = parse(RequestData.url);

		function getHTTPRequest(): NactIncomingMessage {
			function setURL(req: IncomingMessage) {
				req.url = URLdata.pathname + (URLdata.search ? URLdata.search : "");
			}

			function setHost(req: IncomingMessage) {
				req.headers.host = RequestData.headers?.host || (RequestData?.authority ?? false) || (URLdata.host ?? "");
			}

			function setHttpVersion(req: IncomingMessage) {
				req.httpVersionMajor = 1;
				req.httpVersionMinor = 1;
				req.httpVersion = "1.1";
			}
			function setMethod(req: IncomingMessage) {
				req.method = RequestData.method ? RequestData.method.toUpperCase() : "GET";
			}
			function setHeaders(req: IncomingMessage) {
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
			function setUserAgent(req: IncomingMessage) {
				req.headers["user-agent"] = RequestData.headers ? RequestData.headers["user-agent"] : "NactFakeRequest";
			}

			function setRawHeaders(req: IncomingMessage) {
				const headersData = Object.entries(req.headers);
				for (let i = 0; i < headersData.length; i++) {
					const [key, value] = headersData[i];
					if (value !== undefined && value !== null) {
						req.rawHeaders.push(key);
						Array.isArray(value) ? req.rawHeaders.push(...value) : req.rawHeaders.push(value);
					}
				}
			}

			const rawRequest = new NactIncomingMessage(new Socket());

			if (RequestData.body !== undefined) {
				rawRequest.emit("data", RequestData.body);
			}

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
		const response = new NactServerResponse(request);
		const nactRequest = new NactRequest(request, response);

		return await this.__executeRequest(nactRequest);
	}
}

export { NactServer };
