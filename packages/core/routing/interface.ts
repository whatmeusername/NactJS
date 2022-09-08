import type { NactLogger } from "../index";

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

interface ChildRouteSchemaSegment {
	name: string | null;
	optional?: boolean;
	regexp?: RegExp | null;
	parameter?: boolean;
}
type ChildRouteSchema = Array<ChildRouteSchemaSegment>;

interface RouteChild {
	path: string | null;
	fullPath?: string;
	name: string;
	method: "GET" | "POST";
	absolute: boolean;
	schema: ChildRouteSchema;
	dynamicIndexes: number[];
}

export type { NactRoute, RouteChild, ChildRouteSchema, ChildRouteSchemaSegment, NactRoutes, NactLibraryConfig };
