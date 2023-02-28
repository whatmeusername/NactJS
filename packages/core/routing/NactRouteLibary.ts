import { NactRoutes, RouteChild, NactLibraryConfig, handleRouteDataInjections } from "./index";

// TODO REPLACE LATER
import { isUndefined } from "../shared/index";
import {
	findRouteByParams,
	getRouteData,
	getControllerPath,
	getRouteParameters,
	defaultRegexpPresets,
	addPrefixToPath,
} from "./utils";

import { getNactLogger, ROUTE__PATHS, ROUTE__PARAMS, ROUTE__PARAMETER__METADATA, NactServer } from "../index";

import type { ClassInst, NactRouterChild, regexpVariables } from "./interface";
import type { NactLogger, NactRequest, NactRouteMethodData, NactRouteData } from "../index";
import { NactRouter } from "./router-class";
import { RouteHandlerData } from "./RouteHandlerData";

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

	public registerController(controllerClass: ClassInst | ClassInst[]) {

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
						handleRouteDataInjections(controller, descriptorKey);
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

	private getRouteParams(rc: any, route_method: string, req: NactRequest): any[] {
		const routeMetadata = Reflect.getMetadata(ROUTE__PARAMETER__METADATA, rc, route_method);
		if (routeMetadata) {
			return getRouteParameters(routeMetadata[ROUTE__PARAMS] ?? [], req);
		}
		return [];
	}

	public getRouteMethodOr404(req: NactRequest): NactRouter | undefined {
		const urlData = req.getURLData();
		const method = req.getMethod();

		const firstParam = urlData.params[0];
		const Router = this.__routes[firstParam] ?? this.__routes["/"];
		if (Router) {
			const route = findRouteByParams(Router, {
				path: urlData.params,
				method: method,
				fullpath: urlData.pathname ?? "",
			});
			if (route) {
				const controllerInstance = Router.getInstance();

				//@ts-ignore getting method from Class Instance
				const routeHandlerData = new RouteHandlerData(controllerInstance, controllerInstance[route.name], route);
				req.__handler = routeHandlerData;
				routeHandlerData.__routeArgs =
					route.paramsLength > 0 ? this.getRouteParams(controllerInstance.constructor, route.name, req) : [];

				return Router;
			} else {
				req.getResponse().status(404);
			}
		} else {
			req.getResponse().status(404);
		}
	}

	private getRouteMetadata(desc: (...args: any[]) => any, key: string): NactRouteData | undefined;
	private getRouteMetadata(desc: (...args: any[]) => any, key: string, dataOnly: true): RouteChild[] | undefined;
	private getRouteMetadata(desc: (...args: any[]) => any, key: string, dataOnly: false): NactRouteData | undefined;
	private getRouteMetadata(
		desc: (...args: any[]) => any,
		key: string,
		dataOnly?: boolean,
	): RouteChild[] | NactRouteData | undefined {
		const metadata = Reflect.getMetadata(ROUTE__PATHS, desc, key);
		return dataOnly ? metadata?.data : metadata;
	}

	private getOrSetMetadataForRoute(
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

					const routeData = getRouteData(path, methodData.method, descriptorKey);

					routeData.paramsLength = Reflect.getMetadata(ROUTE__PARAMETER__METADATA, controller.constructor, descriptorKey)?.[
						ROUTE__PARAMS
					].length;
					routeData.isAsync =
						Reflect.getOwnPropertyDescriptor(Reflect.getPrototypeOf(controller) ?? {}, descriptorKey)?.value[
							Symbol.toStringTag
						] === "AsyncFunction";

					routeMetaData.push(routeData);
				}

				Reflect.defineMetadata(ROUTE__PATHS, metadata, controller.constructor, descriptorKey);
				return methodData;
			}
		}
	}

	public clear(): void {
		this.__routes = {};
	}
}

export { NactRouteLibrary, NactRouter };
