import type { NactRoutes, RouteChild, NactLibraryConfig } from "./index";

// TODO REPLACE LATER
import { isUppercase, removeSlashes } from "../../utils/Other";
import { getControllerPath } from "../../../app";

import {
	getNactLogger,
	findRouteByParams,
	ROUTE__OPTIONS,
	NactRouteData,
	NactRouteMethodData,
	getRouteData,
} from "../index";
import type { NactLogger, NactRequest, NactRoute } from "../index";

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
		return prefix + "/" + `(${regexAsString})`;
	}
	return prefix + "/" + removeSlashes(path);
};

class NactRouteLibrary {
	protected __routes: NactRoutes;
	protected __logger: NactLogger;
	regexpVariables: regexpVariables;

	constructor(controllers?: ClassInst[], config?: NactLibraryConfig) {
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

		controllerClass = Array.isArray(controllerClass) ? controllerClass : [controllerClass];

		controllerClass.forEach((controller) => {
			const controllerConstructor = controller.constructor as (...args: any[]) => any;
			const contorllerRoutePath = getControllerPath(controllerConstructor);
			if (contorllerRoutePath) {
				const controllerData: NactRoute = { child: {}, absolute: [], self: controller };
				this.__routes[contorllerRoutePath] = controllerData;

				const contorllerDescriptorKeys = getDescriptorKeys(controllerConstructor.prototype);
				const registeredRoutesMessage: string[] = [];

				for (let i = 0; i < contorllerDescriptorKeys.length; i++) {
					const descriptorKey = contorllerDescriptorKeys[i];
					if (isUppercase(descriptorKey)) {
						const routeData: NactRouteData = this.getRouteMetadata(controllerConstructor, descriptorKey);
						const routeMethodsData = Object.values(routeData);
						for (let i = 0; i < routeMethodsData.length; i++) {
							const methodData = routeMethodsData[i];
							const methodPathsData = methodData.data;
							let routesPaths = methodData.paths;

							routesPaths = routesPaths.map((path) => addPrefixToPath(path, contorllerRoutePath));
							const routeData = this.getOrSetMetadataForRoute(
								controllerConstructor,
								descriptorKey,
								methodData.method,
								routesPaths as string[]
							)?.data;

							if (routeData) {
								const routeDataLength = methodPathsData.length;

								for (let i = 0; i < routeDataLength; i++) {
									const routeParams = methodPathsData[i];
									if (routeParams) {
										controllerData.child[routeParams.path] = routeParams;
										if (routeParams.absolute) {
											controllerData.absolute.push(routeParams.path);
										}
									}
								}

								let message = descriptorKey;
								if (routeDataLength > 1) {
									const pathsNames = methodPathsData.reduce((prev, next, i) => {
										prev += `${next.path}${i !== routeDataLength - 1 ? ", " : ""}`;
										return prev;
									}, "");
									message = `${descriptorKey} (path: ${pathsNames})`;
								}

								registeredRoutesMessage.push(message);
							}
						}
					}
				}
				this.__logger.log(
					`successfully registered "${
						controllerConstructor.name
					}" controller with routes methods with names: \n"${registeredRoutesMessage.join(", ")}". \nTotal: ${
						registeredRoutesMessage.length
					} routes`
				);
			}
		});
	}

	getRouteMethodOr404(req: NactRequest): ((...args: any[]) => any[]) | undefined {
		const params = req.urldata.params;
		const firstParam = params[0];
		const Router = this.__routes[firstParam];

		let absolutePath = params.join("/");
		let route: RouteChild | null = null;
		let routeMethod;

		if (Router) {
			if (params.length > 1) {
				if (Router.absolute.includes(absolutePath)) route = Router.child[absolutePath];
				else route = findRouteByParams(Router, { params: params, method: req.method });
			} else {
				absolutePath = firstParam + "//";
				if (Router.absolute.includes(absolutePath)) route = Router.child[absolutePath];
			}
			if (route) {
				req.__route = route;
				//@ts-ignore
				routeMethod = Router.self[route.name];
			} else {
				req.status(404);
			}
		}
		return routeMethod;
	}

	getRouteMetadata(routeDescriptor: (...args: any[]) => any, descriptorKey: string): NactRouteData;
	getRouteMetadata(routeDescriptor: (...args: any[]) => any, descriptorKey: string, dataOnly: true): RouteChild[];
	getRouteMetadata(routeDescriptor: (...args: any[]) => any, descriptorKey: string, dataOnly: false): NactRouteData;
	getRouteMetadata(
		routeDescriptor: (...args: any[]) => any,
		descriptorKey: string,
		dataOnly?: boolean
	): RouteChild[] | NactRouteData {
		const metadata = Reflect.getMetadata(ROUTE__OPTIONS, routeDescriptor, descriptorKey);
		return dataOnly ? metadata?.data : metadata;
	}

	getOrSetMetadataForRoute(
		routeDescriptor: (...args: any[]) => any,
		descriptorKey: string,
		method: string,
		overidedPaths?: string[]
	): NactRouteMethodData | undefined {
		const metadata = this.getRouteMetadata(routeDescriptor, descriptorKey);
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
				const path = paths[i];
				routeMetaData.push(getRouteData(path, methodData.method, descriptorKey));
			}
			Reflect.defineMetadata(ROUTE__OPTIONS, metadata, routeDescriptor, descriptorKey);
			return methodData;
		}
	}

	clear(): void {
		this.__routes = {};
	}
}

export { NactRouteLibrary, getRegexpPresets };
