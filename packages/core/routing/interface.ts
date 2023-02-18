import type { NactLogger } from "../index";
import type { MiddlewareType } from "../middleware";
import type { NactRouter } from "../routing/index";

import { GUARDS_VAR_NAME, MIDDLEWARE_VAR_NAME } from "../nact-constants";

type HTTPMethods = "GET" | "POST" | "HEAD" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";

interface NactLibraryConfig {
	logger?: NactLogger;
}

interface NactRouterChild {
	rn: string;
	RouteChild: RouteChild;
}

interface NactRoutes {
	[K: string]: NactRouter;
}

interface NactRouteWare<T extends typeof MIDDLEWARE_VAR_NAME | typeof GUARDS_VAR_NAME | null = null> {
	// processAt
	fns: (T extends null
		? NactConfigItem
		: T extends typeof MIDDLEWARE_VAR_NAME
		? NactConfigItemMiddleWare
		: NactConfigItem)[];
}

interface NactConfigItem {
	name: string;
	inject: boolean;
	instance: { new (...args: any[]): any } | (new (...args: any[]) => any);
}

interface NactConfigItemMiddleWare extends NactConfigItem {
	type: MiddlewareType;
}

interface NactRouteConfig {
	guards?: NactRouteWare;
	middleware?: NactRouteWare<typeof MIDDLEWARE_VAR_NAME>;
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
	regexp?: {
		regexp: RegExp;
		str: string;
	};
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
	hasOptional: boolean;
	regexp: RegExp;
	paramsLength: 0;
	isAsync: boolean;
}

interface PathWalkerParams {
	method: HTTPMethods | string | null;
	path: ChildRouteSchema | string[];
	fullpath: string;
}

type ClassInst = { new (): any };
type ObjectType<T> = { [K: string]: T };
type regexpVariables = { presets: ObjectType<RegExp | string>; variables: ObjectType<string> };

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
	NactConfigItemMiddleWare,
	NactRouterChild,
	ClassInst,
	ObjectType,
	regexpVariables,
};
