import type { ChildRouteSchema, ChildRouteSchemaSegment, NactRoute, RouteChild } from "../../app";

import { ROUTE__STATUS__CODE, ROUTE__CONTENT__TYPE } from "../core/nact-constants/index";
import type { NactRequest } from "../core/nact-request/request";
import type { NactRouteResponse } from "../../app";
import { getNactLogger } from "../core/nact-logger";

const logger = getNactLogger();

const findRouteByParams = (Router: NactRoute, params: ChildRouteSchema | string[]): RouteChild | null => {
	const routeChilds = Object.values(Router.child);
	const optionalRoutes = [];
	const absolutePath = params.join("/");

	for (let i = 0; i < Router.absolute.length; i++) {
		const RouterAbsolutePath = Router.absolute[i];
		if (absolutePath === RouterAbsolutePath) {
			return Router.child[absolutePath];
		}
	}

	for (let i = 0; i < routeChilds.length; i++) {
		const route = routeChilds[i];
		const mathcing = diffRouteSchemas(route, params);
		if (mathcing === "optional") {
			optionalRoutes.push(route);
		} else if (mathcing === "pass") return route;
	}
	if (optionalRoutes.length > 0) {
		if (optionalRoutes.length === 1) {
			return optionalRoutes[0];
		} else {
			// TODO: VALIDATOR FOR OPTIONAL
		}
	}
	return null;
};

const diffRouteSchemas = (Route: RouteChild, s2: ChildRouteSchema | string[]): "pass" | "optional" | "fail" => {
	let isPassed: "pass" | "optional" | "fail" = "pass";
	let isOptional = false;
	const s1 = Route.schema;

	for (let i = 0; i < s1.length; i++) {
		// TODO: CONTINUE ONLY WITH OPTIONAL ON
		if (isPassed === "pass") {
			const mainSeg = s1[i];

			const pathSeg: string | null = s2[i]
				? ((typeof s2[i] === "string" ? s2[i] : (s2[i] as ChildRouteSchemaSegment).name) as string)
				: null;
			const name = mainSeg?.name;

			if (pathSeg) {
				if (name === null && mainSeg.regexp) {
					isPassed = mainSeg.regexp.test(pathSeg) ? "pass" : "fail";
				} else if (mainSeg.parameter) {
					if (mainSeg?.regexp) {
						isPassed = mainSeg.regexp.test(pathSeg) ? "pass" : "fail";
						console.log(isPassed);
					}
				} else if (mainSeg?.name && !mainSeg?.parameter && !mainSeg?.regexp) {
					isPassed = mainSeg.name === pathSeg ? "pass" : "fail";
				}

				if (mainSeg?.optional) {
					isOptional = true;
				}
			} else {
				if (mainSeg.optional) {
					if (mainSeg.parameter || mainSeg.regexp) isPassed = "fail";
					else {
						isPassed = "optional";
						isOptional = true;
					}
				}
			}
			if (isPassed === "fail") break;
		}
	}
	return isOptional && isPassed === "pass" ? "optional" : isPassed;
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
	const re = /\(.+\)/g;
	//@ts-ignore Regex will return string or null, but not array
	const res = path.match(re);
	let regexpString = res ? res[0] : null;
	if (regexpString) {
		regexpString = regexpString.slice(1, regexpString.length - 1);
		return convertToRegEXP ? new RegExp(regexpString) : regexpString;
	}
	return null;
};

const getPathSchema = (path: string): ChildRouteSchema => {
	if (path === "/") {
		return [{ name: "/" }];
	}

	const res: ChildRouteSchema = [];
	const splited = path.split("/");
	splited.forEach((seg) => {
		const data: ChildRouteSchemaSegment | null = { name: seg };

		const isOptional = isOptionalPathSegment(seg);
		seg = isOptional ? seg.slice(0, seg.length - 1) : seg;

		if (isDynamicWithRegex(seg)) {
			data.parameter = true;
			const name = extractNameFromPath(seg) as string;
			if (name) {
				data.name = name;
				const regexp = extractRegexFromPath(seg, true) as RegExp;
				if (regexp) data.regexp = regexp;
			} else {
				logger.error(
					`One of parameters of path "${path}" dont contain name, parameter: "${seg}". Any path parameter name should contains atleast 1 character.`
				);
			}
		} else if (isRegexPath(seg)) {
			const regexp = extractRegexFromPath(seg, true) as RegExp;
			if (regexp) data.regexp = regexp;
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
	});
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

function HandleRouteResponse(body: any, descriptor: TypedPropertyDescriptor<any>, req: NactRequest): NactRouteResponse {
	const response: NactRouteResponse = { body: body };
	const metaDataKeys = Reflect.getMetadataKeys(descriptor);
	if (metaDataKeys.includes(ROUTE__STATUS__CODE)) {
		req.status(Reflect.getMetadata(ROUTE__STATUS__CODE, descriptor));
	}
	if (metaDataKeys.includes(ROUTE__CONTENT__TYPE)) {
		req.ContentType(Reflect.getMetadata(ROUTE__CONTENT__TYPE, descriptor));
	}
	return response;
}

export { getPathSchema, getRouteParameters, HandleRouteResponse, findRouteByParams, diffRouteSchemas };
