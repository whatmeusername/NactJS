import { ROUTE__PATHS, NactRouteData } from "../../index";

function createMethodDecorator(method: string, paths: (string | RegExp)[]) {
	return function (
		target: () => any,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<any>,
	): TypedPropertyDescriptor<any> {
		let routesData: NactRouteData = Reflect.getMetadata(ROUTE__PATHS, target.constructor, propertyKey);
		if (!routesData) {
			routesData = { [method]: { paths: paths, data: [], method: method } };
		} else {
			routesData[method] = { paths: paths, data: [], method: method };
		}
		Reflect.defineMetadata(ROUTE__PATHS, routesData, target.constructor, propertyKey);

		return descriptor;
	};
}

const Get = (...paths: (string | RegExp)[]): any => createMethodDecorator("GET", paths);
const Post = (...paths: (string | RegExp)[]): any => createMethodDecorator("POST", paths);
const Head = (...paths: (string | RegExp)[]): any => createMethodDecorator("Head", paths);
const Trace = (...paths: (string | RegExp)[]): any => createMethodDecorator("TRACE", paths);
const Option = (...paths: (string | RegExp)[]): any => createMethodDecorator("OPTION", paths);
const Put = (...paths: (string | RegExp)[]): any => createMethodDecorator("PUT", paths);
const Delete = (...paths: (string | RegExp)[]): any => createMethodDecorator("DELETE", paths);
const Patch = (...paths: (string | RegExp)[]): any => createMethodDecorator("PATCH", paths);
const Connect = (...paths: (string | RegExp)[]): any => createMethodDecorator("CONNECT", paths);

export { Get, Post, Head, Trace, Option, Put, Delete, Patch, Connect };
