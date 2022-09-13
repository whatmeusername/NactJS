import type { NactRequest, HTTPMethods } from "../index";
import type { PathWalkerParams, ChildRouteSchemaSegment, ChildRouteSchema, RouteChild, NactRoute } from "./interface";
import { getNactLogger, isUndefined } from "../index";
import { getRegexpPresets } from "./NactRouteLibary";
import { removeSlashes } from "../../utils/Other";

const logger = getNactLogger();

const findRouteByParams = (Router: NactRoute, lookfor: PathWalkerParams): RouteChild | null => {
	const routeChilds = Object.values(Router.child);
	const optionalRoutes = [];
	const method = lookfor.method;
	const absolutePath = lookfor.path.join("/");

	for (let i = 0; i < Router.absolute.length; i++) {
		const nameWithMethod = Router.absolute[i] + "#" + method;
		if (absolutePath === nameWithMethod) {
			return Router.child[nameWithMethod];
		}
	}

	for (let i = 0; i < routeChilds.length; i++) {
		const route = routeChilds[i];
		if (route.method === method) {
			const mathcing = diffRouteSchemas(route, lookfor.path);
			if (mathcing === "optional") {
				optionalRoutes.push(route);
			} else if (mathcing === "pass") return route;
		}
	}
	if (optionalRoutes.length > 0) {
		return optionalRoutes[optionalRoutes.length - 1];
	}
	return null;
};

const diffRouteSchemas = (Route: RouteChild, lookup: ChildRouteSchema | string[]): "pass" | "optional" | "fail" => {
	let isPassed: "pass" | "optional" | "fail" = "pass";
	let isOptional = false;
	const s1 = Route.schema;

	if (s1.length >= lookup.length) {
		for (let i = 0; i < s1.length; i++) {
			// TODO: CONTINUE ONLY WITH OPTIONAL ON
			if (isPassed === "pass" || isPassed === "optional") {
				const routePathSeg = s1[i];

				const lookupSeg: string | null = lookup[i]
					? ((typeof lookup[i] === "string" ? lookup[i] : (lookup[i] as ChildRouteSchemaSegment).name) as string)
					: null;
				const routePathName = routePathSeg?.name;

				if (lookupSeg) {
					if (routePathName === null && routePathSeg.regexp) {
						isPassed = routePathSeg.regexp.test(lookupSeg) ? "pass" : "fail";
					} else if (routePathSeg.parameter) {
						if (routePathSeg?.regexp) {
							isPassed = routePathSeg.regexp.test(lookupSeg) ? "pass" : "fail";
						}
					} else if (routePathSeg?.name && !routePathSeg?.parameter && !routePathSeg?.regexp) {
						isPassed = routePathName === lookupSeg ? "pass" : "fail";
					} else if (routePathName === null && !routePathSeg.optional) {
						isPassed = "fail";
					}

					if (routePathSeg?.optional) {
						isOptional = true;
					}
				} else {
					if (routePathSeg.optional) {
						isPassed = "optional";
						isOptional = true;
					} else isPassed = "fail";
				}
				if (isPassed === "fail") break;
			}
		}
	} else {
		isPassed = "fail";
	}

	return isOptional && isPassed === "pass" ? "optional" : isPassed;
};

const getRouteData = (path: string | RegExp, method: HTTPMethods | string, propertyKey: string): RouteChild => {
	let clearedPath = path.toString();
	let pathSchema: ChildRouteSchema = [];
	let isAbsolute = false;
	let dynamicIndexes: number[] = [];
	const isRegex = path instanceof RegExp;

	if (!isRegex) {
		clearedPath = removeSlashes(path);
		pathSchema = getPathSchema(clearedPath);

		dynamicIndexes = [];
		isAbsolute = true;
		pathSchema.forEach((seg, i) => {
			if (seg?.parameter) {
				isAbsolute = false;
				dynamicIndexes.push(i);
			} else if (seg?.regexp) {
				isAbsolute = false;
			}
		});
	} else if (isRegex) {
		pathSchema = [{ name: null, regexp: path as RegExp }];
	}

	const data: RouteChild = {
		path: clearedPath,
		name: propertyKey,
		method: method,
		absolute: isAbsolute,
		schema: pathSchema,
		dynamicIndexes: dynamicIndexes,
	};

	if (isRegex) data.isRegex = true;

	return data;
};

const isOptionalPathSegment = (path: string): boolean => {
	return path.endsWith("?");
};

const isDynamicPath = (path: string): boolean => {
	const re = /^:{1}[A-Za-z0-9_.~-]+$/;
	return re.test(path);
};

const isDynamicWithRegex = (path: string): boolean => {
	const re = /^:{1}?[A-Za-z0-9_.~-]+\(.*\)$/;
	return re.test(path);
};

const isRegexPath = (path: string): boolean => {
	const re = /^\(.*\)$/;

	return re.test(path);
};

const isAllowedNameForURL = (path: string): boolean => {
	const re = /^[A-Za-z0-9_.~-]*$/;
	return re.test(path);
};

const extractNameFromPath = (path: string): string | null => {
	const re = /\b[A-Za-z0-9_.~-]+\b/;
	//@ts-ignore Regex will return string or null, but not array
	const res = path.match(re);
	return res ? res[0] : null;
};

const extractRegexFromPath = (path: string, convertToRegEXP?: boolean): string | RegExp | null => {
	const checkPreset = (re: string): string => {
		const RegexpPresets = getRegexpPresets().presets;
		const preset = RegexpPresets[re] as string;
		if (preset) {
			return preset;
		}
		return re;
	};

	const re = /\(.+\)/g;
	const res = path.match(re);
	let regexpString = res ? res[0] : null;
	if (regexpString) {
		regexpString = checkPreset(regexpString.slice(1, regexpString.length - 1)) as string;
		return convertToRegEXP ? new RegExp(regexpString) : regexpString;
	}
	return null;
};

const getPathSchema = (path: string): ChildRouteSchema => {
	if (path === "/") {
		return [{ name: "/" }];
	}

	const RegexEmptyError = (seg: string): void => {
		logger.error(
			`Got empty regexp value from path segment ${seg} of path ${path}. Regexp should not contains empty values.`
		);
	};

	const res: ChildRouteSchema = [];
	const splited = path.split("/");
	for (let i = 0; i < splited.length; i++) {
		let seg = splited[i];
		if (!isUndefined(seg)) {
			const data: ChildRouteSchemaSegment | null = { name: null };

			const isOptional = isOptionalPathSegment(seg);
			seg = isOptional ? seg.slice(0, seg.length - 1) : seg;

			if (isDynamicWithRegex(seg)) {
				data.parameter = true;
				const name = extractNameFromPath(seg) as string;
				if (name) {
					data.name = name;
					const regexp = extractRegexFromPath(seg, true) as RegExp;
					if (regexp) data.regexp = regexp;
					else RegexEmptyError(seg);
				}
			} else if (isRegexPath(seg)) {
				const regexp = extractRegexFromPath(seg, true) as RegExp;
				if (regexp && `${regexp}`.length > 0) {
					data.regexp = regexp;
				} else {
					RegexEmptyError(seg);
				}
			} else if (isDynamicPath(seg)) {
				data.parameter = true;
				data.name = extractNameFromPath(seg) as string;
			} else if (isAllowedNameForURL(seg)) {
				data.name = extractNameFromPath(seg) as string;
			} else {
				logger.error(`Part "${seg}" of path "${path}" does not match any allowed pattern.
		Check if:
		1. Make sure if your path is using allowed characters specified in RFC3968 (2.3): (A-Z, a-z, 0-9, _, ., ~, -,). 
		2. If using regex then follow one of these patterns:
			- ( :example(^.*\\D$)"?" ): for parameter path segment
			- ( (^.*\\D$)"?" ): for non parameter path segment
	
			("?" - stands for: allowing using optional)
				`);
			}

			if (isOptional) {
				data.optional = true;
			}

			res.push(data);
		}
	}
	return res;
};

function getRouteParameters(params: any[], req: NactRequest): any | null {
	const result = [];
	for (let i = 0; i < params.length; i++) {
		const param = params[i];
		if (typeof param === "function") {
			result.push(param(req));
		}
	}
	return result;
}

// function HandleRouteResponse(body: any, descriptor: TypedPropertyDescriptor<any>, req: NactRequest): NactRouteResponse {
// 	const response: NactRouteResponse = { body: body };
// 	const metaDataKeys = Reflect.getMetadataKeys(descriptor);
// 	if (metaDataKeys.includes(ROUTE__STATUS__CODE)) {
// 		req.status(Reflect.getMetadata(ROUTE__STATUS__CODE, descriptor));
// 	}
// 	if (metaDataKeys.includes(ROUTE__CONTENT__TYPE)) {
// 		req.ContentType(Reflect.getMetadata(ROUTE__CONTENT__TYPE, descriptor));
// 	}
// 	return response;
// }

export { getPathSchema, getRouteParameters, findRouteByParams, diffRouteSchemas, getRouteData };
