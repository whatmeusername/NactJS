import type { NactRoutes, RouteChild, NactLibraryConfig } from "./index";

// TODO REPLACE LATER
import { removeSlashes } from "../shared/index";
import {
	findRouteByParams,
	getRouteData,
	getControllerPath,
	getRouteParameters,
	getRouteConfig,
	setRouteConfig,
} from "./utils";

import {
	getNactLogger,
	ROUTE__PATHS,
	NactRouteData,
	NactRouteMethodData,
	isUndefined,
	getTransferModule,
	ROUTE__PARAMS,
	ROUTE__PARAMETER__METADATA,
	RouteHandlerData,
	NactServer,
} from "../index";
import type { NactRouteWare, PathWalkerParams } from "./interface";
import type { NactLogger, NactRequest, NactRouteConfig } from "../index";
import { NactRouter, NactRouterChild } from "./router-class";

type ClassInst = { new (): any };
type ObjectType<T> = { [K: string]: T };
type regexpVariables = { presets: ObjectType<RegExp | string>; variables: ObjectType<string> };

const defaultRegexpPresets: regexpVariables = {
	presets: {
		"*": ".*",
		str: "^\\D+$",
		num: "^\\d+$",
	},
	variables: {},
};

const getRegexpPresets = (): regexpVariables => {
	return defaultRegexpPresets;
};

const addPrefixToPath = (path: string | RegExp, prefix: string): string => {
	if (path instanceof RegExp) {
		const regexAsString = removeSlashes(path.toString());
		const res = (prefix + "/" + `(${regexAsString})`).toLowerCase();
		return res;
	}
	const isSlashOnly = path === "/";
	const res = (prefix + (isSlashOnly ? "" : "/") + removeSlashes(path)).toLowerCase();
	return res;
};

function handleRouteDataInjections(target: any, descriptorKey?: string): NactRouteConfig | undefined {
	if (!target) return {};

	const routeConfig: NactRouteConfig | undefined = getRouteConfig(target, descriptorKey);
	if (routeConfig) {
		const routeConfigValues: NactRouteWare[] = Object.values(routeConfig) as NactRouteWare[];
		for (let i = 0; i < routeConfigValues.length; i++) {
			const configItems = routeConfigValues[i]?.fns ?? [];
			for (let j = 0; j < configItems.length; j++) {
				const configItem = configItems[i];
				if (typeof configItem === "object" && configItem?.inject === true) {
					const tm = getTransferModule();
					const coreModule = tm.getCoreModule();
					if (coreModule) {
						let existedProvider = coreModule.getProvider(configItem.instance);
						if (!existedProvider) {
							existedProvider = coreModule.appendProvider(configItem.instance);
						}
						if (existedProvider?.isReady) {
							configItem.instance = existedProvider.instance;
						}
					}
				}
			}
		}
		setRouteConfig(routeConfig, target, descriptorKey);
	}
	return routeConfig;
}

class NactRouteLibrary {
	protected __routes: NactRoutes;
	protected __logger: NactLogger;
	regexpVariables: regexpVariables;

	constructor(private readonly app: NactServer, controllers?: ClassInst[], config?: NactLibraryConfig) {
		this.__routes = {};
		this.__logger = config?.logger ?? getNactLogger();
		this.regexpVariables = defaultRegexpPresets;

		if (controllers) this.registerController(controllers);
	}

	registerController(controllerClass: ClassInst | ClassInst[]) {
		const getDescriptorKeys = (prototype: any): string[] => {
			if (prototype) {
				return Object.keys(Object.getOwnPropertyDescriptors(prototype));
			}
			return [];
		};

		const sortRoutes = (router: NactRouter): void => {
			let sort: { a: NactRouterChild[]; wnr: NactRouterChild[]; wr: NactRouterChild[]; opt: NactRouterChild[] } = {
				a: [],
				wnr: [],
				wr: [],
				opt: [],
			};

			//@ts-ignore
			for (let i = 0; i < router.child.length; i++) {
				//@ts-ignore
				const c = router.child[i];
				const d = c.RouteChild;

				if (d.absolute) {
					sort["a"].push(c);
				} else if (d.dynamicIndexes.length > 0 && !d.isRegex && !d.hasOptional) {
					sort["wnr"].push(c);
				} else if (d.dynamicIndexes.length > 0 && d.isRegex && !d.hasOptional) {
					sort["wr"].push(c);
				} else {
					sort["opt"].push(c);
				}
			}
			//@ts-ignore
			router.child = Object.values(sort).flat(1);
		};

		const LogRegisteredRoutes = (messages: string[], constructor: (...args: any[]) => any): void => {
			this.__logger.log(
				`successfully registered "${constructor.name}" controller with routes methods with names: \n"${messages.join(
					", ",
				)}". \nTotal: ${messages.length} routes`,
			);
		};

		controllerClass = Array.isArray(controllerClass) ? controllerClass : [controllerClass];

		controllerClass.forEach((controller) => {
			const controllerConstructor = controller.constructor as (...args: any[]) => any;
			const contorllerRoutePath = getControllerPath(controllerConstructor);

			handleRouteDataInjections(controller);
			if (contorllerRoutePath) {
				const controllerData: NactRouter = new NactRouter(controller, this.app);
				this.__routes[contorllerRoutePath] = controllerData;

				const contorllerDescriptorKeys = getDescriptorKeys(controllerConstructor.prototype);
				const registeredRoutesMessage: string[] = [];

				for (let i = 0; i < contorllerDescriptorKeys.length; i++) {
					const descriptorKey = contorllerDescriptorKeys[i];
					const routeData: NactRouteData | undefined = this.getRouteMetadata(controllerConstructor, descriptorKey);

					if (routeData) {
						const routeMethodsData = Object.values(routeData);
						for (let i = 0; i < routeMethodsData.length; i++) {
							const methodData = routeMethodsData[i];
							const methodPathsData = methodData.data;
							let routesPaths = methodData.paths;

							routesPaths = routesPaths.map((path) => addPrefixToPath(path, contorllerRoutePath));
							const routePathData = this.getOrSetMetadataForRoute(
								controller,
								descriptorKey,
								methodData.method,
								routesPaths as string[],
							)?.data;

							if (routePathData) {
								const routePathDataLength = methodPathsData.length;

								for (let i = 0; i < routePathDataLength; i++) {
									const routeParams = methodPathsData[i];
									if (routeParams) {
										controllerData.addRoute(routeParams);
									}
								}

								let message = descriptorKey;
								if (routePathDataLength > 1) {
									const pathsNames = methodPathsData.reduce((prev, next, i) => {
										prev += `${next.path}${i !== routePathDataLength - 1 ? ", " : ""}`;
										return prev;
									}, "");
									message = `${descriptorKey} (path: ${pathsNames})`;
								}

								registeredRoutesMessage.push(message);
							}
						}
					}
				}

				sortRoutes(controllerData);
				LogRegisteredRoutes(registeredRoutesMessage, controllerConstructor);
			}
		});
	}

	protected walkRoute(Router: NactRouter, params: PathWalkerParams): RouteChild | null {
		const absolutePath = params.path.join("/");
		const method = params.method;
		let route: RouteChild | null = null;

		if (Router.hasAbsolute(absolutePath, method)) route = Router.getChild(absolutePath, method) as RouteChild;
		else route = findRouteByParams(Router, params);

		if (route) {
			//@ts-ignore
			return route;
		}
		return null;
	}

	getRouteParams(rc: any, routeKEY: string, req: NactRequest): any[] {
		const routeMetadata = Reflect.getMetadata(ROUTE__PARAMETER__METADATA, rc, routeKEY);

		let methodParamsVariables: any[] = [];

		if (routeMetadata) {
			const methodParams = routeMetadata[ROUTE__PARAMS] ?? [];
			methodParamsVariables = getRouteParameters(methodParams, req);
		}
		return methodParamsVariables;
	}

	getRouteMethodOr404(req: NactRequest): NactRouter | undefined {
		const params = req.getURLData().params;
		const method = req.getMethod();

		const firstParam = params[0];
		const Router = this.__routes[firstParam] ?? this.__routes["/"];
		if (Router) {
			const route = this.walkRoute(Router, { path: params, method: method });
			if (route) {
				const controllerInstance = Router.getInstance();

				//@ts-ignore getting method from Class Instance
				const routeHandlerData = new RouteHandlerData(controllerInstance, controllerInstance[route.name], route);
				req.__handler = routeHandlerData;
				routeHandlerData.__routeArgs = this.getRouteParams(controllerInstance.constructor, route.name, req);

				return Router;
			} else {
				req.getResponse().status(404);
			}
		} else {
			req.getResponse().status(404);
		}
	}

	getRouteMetadata(desc: (...args: any[]) => any, key: string): NactRouteData | undefined;
	getRouteMetadata(desc: (...args: any[]) => any, key: string, dataOnly: true): RouteChild[] | undefined;
	getRouteMetadata(desc: (...args: any[]) => any, key: string, dataOnly: false): NactRouteData | undefined;
	getRouteMetadata(
		desc: (...args: any[]) => any,
		key: string,
		dataOnly?: boolean,
	): RouteChild[] | NactRouteData | undefined {
		const metadata = Reflect.getMetadata(ROUTE__PATHS, desc, key);
		return dataOnly ? metadata?.data : metadata;
	}

	getOrSetMetadataForRoute(
		controller: any,
		descriptorKey: string,
		method: string,
		overidedPaths?: string[],
	): NactRouteMethodData | undefined {
		const metadata = this.getRouteMetadata(controller.constructor, descriptorKey);
		if (metadata) {
			const methodData = metadata[method];

			if (methodData) {
				if (!overidedPaths && methodData.paths.length === methodData.data.length) {
					return methodData;
				}

				const pathsLength = methodData.paths.length;
				if (overidedPaths) {
					methodData.paths = overidedPaths;
				}

				const routeMetaData: RouteChild[] = methodData.data;
				const paths = methodData.paths;
				for (let i = 0; i < pathsLength; i++) {
					let path = paths[i];
					path = isUndefined(path) ? "/" : path;
					handleRouteDataInjections(controller, descriptorKey);

					const routeData = getRouteData(path, methodData.method, descriptorKey);
					routeMetaData.push(routeData);
				}
				Reflect.defineMetadata(ROUTE__PATHS, metadata, controller.constructor, descriptorKey);
				return methodData;
			}
		}
	}

	clear(): void {
		this.__routes = {};
	}
}

export { NactRouteLibrary, getRegexpPresets, NactRouter };
