import type { NactRoutes, RouteChild, NactLibraryConfig } from "./index";

// TODO REPLACE LATER
import { isUppercase } from "../../utils/Other";
import { getControllerPath } from "../../../app";

import { getNactLogger, findRouteByParams, ROUTE__OPTIONS } from "../index";
import type { NactLogger, NactRequest } from "../index";

type ClassInst = { new (): any };
class NactRouteLibrary {
	protected __routes: NactRoutes;
	protected __logger: NactLogger;

	constructor(controllers?: ClassInst[], config?: NactLibraryConfig) {
		this.__routes = {};
		this.__logger = config?.logger ?? getNactLogger();

		if (controllers) this.registerController(controllers);
	}

	registerController(controllerClass: ClassInst | ClassInst[]) {
		controllerClass = Array.isArray(controllerClass) ? controllerClass : [controllerClass];
		controllerClass.forEach((controller) => {
			const controllerConstructor = controller.constructor;
			const contorllerRoutePath = getControllerPath(controllerConstructor as any);
			if (contorllerRoutePath) {
				this.__routes[contorllerRoutePath] = { child: {}, absolute: [], self: controller };
				const CurrentRoute = this.__routes[contorllerRoutePath];

				const controllerDescriptors = Object.getOwnPropertyDescriptors(controllerConstructor.prototype);
				const contorllerDescriptorKeys = Object.keys(controllerDescriptors);
				const registeredRoutes: string[] = [];

				contorllerDescriptorKeys.forEach((descriptorKey) => {
					if (isUppercase(descriptorKey)) {
						const descriptorConstructor = controller.constructor;
						const routesParamters: RouteChild[] = Reflect.getMetadata(
							ROUTE__OPTIONS,
							descriptorConstructor,
							descriptorKey
						);
						const routesParamtersLength = routesParamters.length;

						for (let i = 0; i < routesParamtersLength; i++) {
							const routeParamters = routesParamters[i];
							if (routeParamters) {
								routeParamters.schema.unshift({ name: contorllerRoutePath as string });

								const absolutePath = contorllerRoutePath + "/" + routeParamters.path;

								CurrentRoute.child[absolutePath] = { ...routeParamters, fullPath: absolutePath };
								if (routeParamters.absolute) {
									CurrentRoute.absolute.push(absolutePath);
								}
							}
						}

						let message = descriptorKey;
						if (routesParamtersLength > 1) {
							const pathsNames = routesParamters.reduce((prev, next, i) => {
								prev += `${next.path}${i !== routesParamtersLength - 1 ? ", " : ""}`;
								return prev;
							}, "");
							message = `${descriptorKey} (path: ${pathsNames})`;
						}

						registeredRoutes.push(message);
					}
				});
				this.__logger.log(
					`successfully registered "${
						controllerConstructor.name
					}" controller with routes methods with names: "${registeredRoutes.join(", ")}". Total: ${
						registeredRoutes.length
					} routes`
				);
			}
			console.log(this.__routes);
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
			} else {
				req.status(404);
			}
		}
		return routeMethod;
	}

	clear(): void {
		this.__routes = {};
	}
}

export { NactRouteLibrary };
