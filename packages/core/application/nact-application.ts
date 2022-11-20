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

import type { InjectRequest, NactListernerEvent, serverSettings } from "./interface";
import { HttpExpectionHandler, BaseHttpExpectionHandler } from "../expections";

function runMiddlewares(middlewares: NactMiddleWare<MiddleType>[], NactRequest: NactRequest): boolean {
	function next(value: string): void {
		if (value === "route") {
			end = true;
		} else if (typeof value === "string") {
			// TODO: THROW NACT ERRORS;
			throw new Error(value);
		}
	}

	let end = false;

	for (let i = 0; i < middlewares.length; i++) {
		if (end) break;
		if (!NactRequest.isSended()) {
			const data = middlewares[i];
			const middleware = data.middleware;
			if (data.type === "nact") {
				(middleware as NactMiddlewareFunc<"nact">)(NactRequest);
			} else {
				(middleware as NactMiddlewareFunc)(NactRequest.getRequest(), NactRequest.getResponse(), next);
			}
		} else return false;
	}
	return true;
}

export type MiddleType = "nact" | "express" | "fastify";

export type NactMiddlewareFunc<T extends void | MiddleType = void> = T extends "nact"
	? (req: NactRequest) => any
	: (req: NactIncomingMessage, res: NactServerResponse, next: any) => any;
export type NactMiddleWare<T extends MiddleType> = { middleware: NactMiddlewareFunc<T>; type: T };

class NactGlobalConfig {
	private middleware: NactMiddleWare<MiddleType>[];
	private handlers: any[];
	// handlers
	// guards
	// pipes
	//afterware
	constructor(private readonly server: NactServer) {
		this.middleware = [];
		this.handlers = [];
	}

	getGlobalMiddleware(): NactMiddleWare<MiddleType>[] {
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

	addGlobalMiddleware(middleware: NactMiddlewareFunc<typeof type>, type: MiddleType = "nact"): void {
		if (Array.isArray(middleware)) {
			const res: NactMiddleWare<typeof type> = { middleware: middleware, type: type ?? "nact" };
			this.middleware = [...this.middleware, ...middleware];
		} else {
			const res = { middleware: middleware, type: type ?? "nact" };
			this.middleware.push(res);
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

	private listeners: { start: (() => void)[]; close: (() => void)[] };

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

		this.listeners = { start: [], close: [] };
	}

	// --- subscribers
	on(event: NactListernerEvent, cb: () => void): void {
		if (this.listeners[event] && typeof cb === "function") {
			this.listeners[event].push(cb);
		} else {
			this.logger.warning(`tried to subscribe on ${event} event, that not exists defined in nact`);
		}
	}

	emit(event: NactListernerEvent): void {
		const events = this.listeners[event];
		if (event && Array.isArray(events)) {
			for (let i = 0; i < events.length; i++) {
				events[i]();
			}
		}
	}

	// ---- Global ----

	public getGlobalConfig(): NactGlobalConfig {
		return this.GlobalConfig;
	}

	public useMiddleware(
		middleware: NactMiddlewareFunc<typeof type>,
		type: "express" | "fastify" | "nact" = "nact",
	): this {
		this.GlobalConfig.addGlobalMiddleware(middleware, type);
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
	protected async __initialize(): Promise<void> {
		this.useHandler(BaseHttpExpectionHandler);
		await this.getTransferModule().initialize();

		const controllers = this.getTransferModule().getModulesControllers(true);
		this.RouteLibrary.registerController(controllers);

		this.getTransferModule().emitAllProviderEvent("start");
		this.on("close", () => {
			this.getTransferModule().emitAllProviderEvent("close");
		});

		this.__getLocalMachineIP();

		this.__messageOnInitilizationEnd();
	}

	protected __messageOnInitilizationEnd(): void {
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

	protected __RequestHandler = (req: NactIncomingMessage, res: NactServerResponse): void => {
		const request = new NactRequest(req, res);
		request.getRequest().once("end", () => {
			this.__executeRequest(request);
		});
	};

	protected async __executeRequest(request: NactRequest): Promise<NactRequest | undefined> {
		if (runMiddlewares(this.GlobalConfig.getGlobalMiddleware(), request)) {
			const HandlerRouter = this.RouteLibrary.getRouteMethodOr404(request);

			const handlerData = request.getHandlerData();
			if (HandlerRouter) {
				const response = new Promise((resolve) => {
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

	public listen(port: number): this {
		if (!this.running) {
			this.server.listen(port, () => {
				this.__initialize();
				this.running = true;
				this.serverPort = port;
			});
		}
		return this;
	}

	public async offline(): Promise<this> {
		if (!this.running) {
			await this.__initialize();
			this.running = true;
		}
		return this;
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
