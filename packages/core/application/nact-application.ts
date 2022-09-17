import "reflect-metadata";

import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse } from "url";
import { networkInterfaces } from "os";
import { Socket } from "net";

import type { Server } from "http";

import { createSharedNactLogger, NactLogger } from "../nact-logger/logger";
import { NactRouteLibrary } from "../routing/NactRouteLibary";
import { NactRequest } from "../nact-request";
import { createNewTransferModule, getTransferModule, NactTransferModule } from "../Module";

import type { InjectRequest, serverSettings } from "./interface";

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
	protected server: Server;
	private serverRunningURL: string | null;
	private serverPort: number | null;
	protected RouteLibrary: NactRouteLibrary;
	private IPv4: string | null;
	private logger: NactLogger;
	protected middleware: any; //NactMiddleware;
	private running: boolean;
	private transferModuleKey: string;

	constructor(transferModuleKey?: string, serverSetting?: serverSettings) {
		this.server = createServer(this.__RequestHandler);
		this.serverRunningURL = null;
		this.serverPort = null;
		this.logger = createSharedNactLogger({ isEnable: serverSetting?.loggerEnabled ?? true });
		this.RouteLibrary = new NactRouteLibrary(undefined, { logger: this.logger });
		this.IPv4 = null;
		this.middleware = [];
		this.running = false;
		this.transferModuleKey = transferModuleKey ?? "0";

		this.__initialize();
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

	public getTransferModuleKey(): string {
		return this.transferModuleKey;
	}

	// ===== Initilization =====
	protected async __initialize() {
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

	protected __RequestHandler = (req: IncomingMessage, res: ServerResponse) => {
		const request = new NactRequest(req, res);
		this.__executeRequest(request);
	};

	protected async __executeRequest(request: NactRequest): Promise<NactRequest | undefined> {
		let response = undefined;
		if (runMiddlewares(this.middleware, request)) {
			const routeMethod = this.RouteLibrary.getRouteMethodOr404(request);
			if (routeMethod) {
				response = new Promise((resolve) => {
					return resolve(routeMethod(request)) as any;
				});
				await response
					.then((res) => {
						request.setPayload(res);
					})
					.catch((err) => {
						const route = request.__getRoute();
						const handlers = route?.ware.handlers;
						console.log(err.message, "error", route);
						// TODO exception
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

	public useMiddleware(middleware: (req: NactRequest) => void) {
		this.middleware.push(middleware);
		this.logger.info(
			`"${middleware.name ?? "NAME IS UNKNOWN"}" function is now used as global middleware`,
			"MIDDLEWARE"
		);
		return this;
	}

	public resetConfiguration() {
		this.middleware = [];
	}

	public async clearModuleConfiguration(
		cb?: (transferModuleKey: string, transferModule: NactTransferModule) => void
	): Promise<void> {
		const transferModule = createNewTransferModule(this.transferModuleKey);
		this.RouteLibrary.clear();
		if (cb) cb(this.transferModuleKey, this.getTransferModule());

		await transferModule.initialize();

		const controllers = this.getTransferModule().getModulesControllers(true);
		this.RouteLibrary.registerController(controllers);
	}

	public async injectRequest(RequestData: InjectRequest) {
		const URLdata = parse(RequestData.url);

		function getHTTPRequest(): IncomingMessage {
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

			const rawRequest = new IncomingMessage(new Socket());

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
		const response = new ServerResponse(request);
		const nactRequest = new NactRequest(request, response);

		return await this.__executeRequest(nactRequest);
	}
}

export { NactServer };
