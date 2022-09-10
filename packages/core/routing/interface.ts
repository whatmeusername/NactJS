import type { NactLogger } from "../index";

type HTTPMethods = "GET" | "POST" | "HEAD" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";

interface NactLibraryConfig {
	logger?: NactLogger;
}

interface NactRoutes {
	[K: string]: NactRoute;
}

interface NactRoute {
	child: { [K: string]: RouteChild };
	absolute: string[];
	self: { new (): any };
}

interface NactRouteMethodData {
	method: HTTPMethods | string;
	paths: (string | RegExp)[];
	data: RouteChild[];
}
interface NactRouteData {
	[key: string]: NactRouteMethodData;
}

interface ChildRouteSchemaSegment {
	name: string | null;
	optional?: boolean;
	regexp?: RegExp | null;
	parameter?: boolean;
}
type ChildRouteSchema = Array<ChildRouteSchemaSegment>;

interface RouteChild {
	path: string;
	name: string;
	method: HTTPMethods | string;
	absolute: boolean;
	schema: ChildRouteSchema;
	dynamicIndexes: number[];
	isRegex?: boolean;
}

export type {
	NactRoute,
	RouteChild,
	ChildRouteSchema,
	ChildRouteSchemaSegment,
	NactRoutes,
	NactLibraryConfig,
	HTTPMethods,
	NactRouteMethodData,
	NactRouteData,
};
