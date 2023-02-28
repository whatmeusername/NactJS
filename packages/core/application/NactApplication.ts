import "reflect-metadata";

import { createServer, IncomingMessage, RequestListener } from "http";
import { parse } from "url";
import { networkInterfaces } from "os";
import { Socket } from "net";
import { createSharedNactLogger, NactLogger } from "../nact-logger/logger";
import { NactRequest, NactServerResponse, NactIncomingMessage } from "../nact-request";
import { createNewTransferModule, getTransferModule, NactTransferModule } from "../module";
import { HttpExpectionHandler, BaseHttpExpectionHandler, HttpExpection } from "../expections";
import { NactRouteLibrary } from "../routing/NactRouteLibary";
import { NactMiddlewareFunc } from "../middleware";
import { NactGlobalConfig } from "./NactApplicationGlobalConfig";

import { InjectRequest, NactListernerEvent, NactWareExectionDirection, serverSettings } from "./interface";
import type { Server } from "http";

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
	public on(event: NactListernerEvent, cb: () => void): void {
		if (this.listeners[event] && typeof cb === "function") {
			this.listeners[event].push(cb);
		} else {
			this.logger.warning(
				`Tried to subscribe on ${event} event, that not existsing in nact. Available events are: start and close.`,
			);
		}
	}

	public emit(event: NactListernerEvent): void {
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

		this.getTransferModule().emitAllProviderEvent(NactListernerEvent.START);
		this.on(NactListernerEvent.CLOSE, () => {
			this.getTransferModule().emitAllProviderEvent(NactListernerEvent.CLOSE);
		});

		this.__getLocalMachineIP();

		this.__messageOnInitilizationEnd();
	}

	protected __messageOnInitilizationEnd(): void {
		if (this.running) {
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

	protected async __executeRequest(ctx: NactRequest): Promise<NactRequest | undefined> {
		let isRunned = false;
		let HandlerRouter;

		try {
			if (this.GlobalConfig.executeGlobalWare(NactWareExectionDirection.BEFORE, ctx)) {
				HandlerRouter = this.RouteLibrary.getRouteMethodOr404(ctx);
				const handlerData = ctx.getHandlerData();
				if (HandlerRouter && handlerData) {
					const routeData = handlerData.getRouteData();
					if (this.GlobalConfig.executeWare(NactWareExectionDirection.BEFORE, ctx, handlerData?.getHandlerClass())) {
						if (this.GlobalConfig.executeWare(NactWareExectionDirection.BEFORE, ctx, handlerData?.getHandler())) {
							isRunned = true;

							const response = routeData.isAsync
								? await new Promise((r) => {
										return r(handlerData?.callMethod());
								  })
								: handlerData?.callMethod();
							ctx.setPayload(response);
						}
					}
				}
			}
		} catch (err: any) {
			if (HandlerRouter && err instanceof HttpExpection) {
				let isHandled = false;
				if (isRunned) {
					const routeConfig = HandlerRouter.getControllerHandler();
					isHandled = routeConfig.handle(err, ctx);
				} else {
					const globalHandlers = this.GlobalConfig.getHandlers();
					for (let i = 0; i < globalHandlers.length; i++) {
						isHandled = globalHandlers[i].accept(err, ctx);
					}
				}

				if (!isHandled) {
					throw err;
				}
			} else throw err;
		}

		return ctx.send();
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
				const serverURL = "http://" + (this.IPv4 ?? "localhost") + ":" + this.serverPort + "/";
				this.serverRunningURL = serverURL;
				this.logger.log(`NactServer is now running on ${serverURL}`);
			});
		}
		return this;
	}

	public async offline(): Promise<this> {
		if (!this.running) {
			await this.__initialize();
			this.running = true;
			this.logger.log(`NactServer is now running offine. Server is accepting requests only through injectRequest method.`);
		}
		return this;
	}

	public resetConfiguration(): void {
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
