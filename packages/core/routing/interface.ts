import type { NactLogger } from "../index";

import type { NactRouter } from "../routing/index";

type HTTPMethods = "GET" | "POST" | "HEAD" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";

interface NactLibraryConfig {
	logger?: NactLogger;
}

interface NactRoutes {
	[K: string]: NactRouter;
}

interface NactRouteWare {
	// processAt
	fns: NactConfigItem[];
}

interface NactConfigItem {
	name: string;
	inject: boolean;
	instance: { new (...args: any[]): any } | (new (...args: any[]) => any);
}

interface NactRouteConfig {
	handlers?: NactRouteWare;
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

interface PathWalkerParams {
	method: HTTPMethods | string | null;
	path: ChildRouteSchema | string[];
}

export type {
	PathWalkerParams,
	RouteChild,
	ChildRouteSchema,
	ChildRouteSchemaSegment,
	NactRoutes,
	NactLibraryConfig,
	HTTPMethods,
	NactRouteMethodData,
	NactRouteData,
	NactRouteConfig,
	NactRouteWare,
	NactConfigItem,
};
