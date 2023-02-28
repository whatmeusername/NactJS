import {
	NactRequest,
	HTTPMethods,
	ROUTE__CONFIG,
	CONTROLLER_ROUTER__NAME,
	ROUTE__PARAMS,
	ROUTE__PARAMETER__METADATA,
} from "../index";
import type {
	PathWalkerParams,
	ChildRouteSchemaSegment,
	ChildRouteSchema,
	RouteChild,
	NactRouteConfig,
	regexpVariables,
} from "./interface";
import { getNactLogger, isUndefined } from "../index";
import { NactRouter } from "./NactRouteLibary";
import { isClassInstance, isInitializedClass, removeSlashes } from "../shared";

const logger = getNactLogger();

function findRouteByParams(Router: NactRouter, lookfor: PathWalkerParams): RouteChild | null {
	const routeChilds = Router.getChild();
	const optionalRoutes = [];
	const method = lookfor.method;

	let route: RouteChild | null = Router.getAbsoluteOrNull(lookfor.fullpath, method);
	if (route) return route;

	for (let i = 0; i < routeChilds.length; i++) {
		const routeData = routeChilds[i].RouteChild;
		if (routeData.method === method && (routeData.hasOptional || routeData.schema.length == lookfor.path.length)) {
			const isMatch = routeData.regexp.test(lookfor.fullpath);
			if (isMatch && routeData.hasOptional) {
				optionalRoutes.push(routeData);
			} else if (isMatch) return routeData;
		}
	}

	if (optionalRoutes.length > 0) {
		return optionalRoutes[optionalRoutes.length - 1];
	}
	return null;
}

function diffRouteSchemas(Route: RouteChild, lookup: ChildRouteSchema | string[]): "pass" | "optional" | "fail" {
	let isPassed: "pass" | "optional" | "fail" = "pass";
	let isOptional = false;
	const s1 = Route.schema;

	if (s1.length >= lookup.length) {
		for (let i = 0; i < s1.length; i++) {
			if (isPassed === "pass" || isPassed === "optional") {
				const routePathSeg = s1[i];

				const lookupSeg: string | null = lookup[i]
					? ((typeof lookup[i] === "string" ? lookup[i] : (lookup[i] as ChildRouteSchemaSegment).name) as string)
					: null;
				const routePathName = routePathSeg?.name;

				if (lookupSeg) {
					if (routePathName === null && routePathSeg.regexp) {
						isPassed = routePathSeg.regexp.regexp.test(lookupSeg) ? "pass" : "fail";
					} else if (routePathSeg.parameter) {
						if (routePathSeg?.regexp) {
							isPassed = routePathSeg.regexp.regexp.test(lookupSeg) ? "pass" : "fail";
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
}

function BuildRegexFromSchema(shchema: ChildRouteSchema): RegExp {
	let regexString = "";

	for (let i = 0; i < shchema.length; i++) {
		const part = shchema[i];

		if (i > 0 && !part.optional) {
			regexString += "\\/";
		}

		let regSegment = "";

		if (part.regexp) {
			regSegment = part.regexp.str;
		} else if (part.parameter) {
			regSegment = "[^\\/]+";
		} else {
			regSegment = part.name ?? "";
		}

		if (part.optional) {
			regSegment = `(\\/${regSegment})?`;
		}

		regexString += regSegment;
	}
	return new RegExp(`^\\/?${regexString}\\/?$`);
}

function getRouteData(path: string | RegExp, method: HTTPMethods | string, propertyKey: string): RouteChild {
	let clearedPath = path.toString();
	let pathSchema: ChildRouteSchema = [];
	let isAbsolute = false;
	let hasOptional = false;
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
			if (seg.optional) {
				hasOptional = true;
			}
		});
	} else if (isRegex) {
		pathSchema = [{ name: null, regexp: { regexp: path as RegExp, str: extractBodyFromRegexAsString(path) } }];
	}

	const data: RouteChild = {
		path: clearedPath,
		name: propertyKey,
		method: method,
		absolute: isAbsolute,
		schema: pathSchema,
		dynamicIndexes: dynamicIndexes,
		hasOptional: hasOptional,
		regexp: BuildRegexFromSchema(pathSchema),
		paramsLength: 0,
		isAsync: false,
	};

	if (isRegex) data.isRegex = true;

	return data;
}

function isOptionalPathSegment(path: string): boolean {
	return path.endsWith("?");
}

function isDynamicPath(path: string): boolean {
	const re = /^:{1}[A-Za-z0-9_.~-]+$/;
	return re.test(path);
}

function isDynamicWithRegex(path: string): boolean {
	const re = /^:{1}?[A-Za-z0-9_.~-]+\(.*\)$/;
	return re.test(path);
}

function isRegexPath(path: string): boolean {
	const re = /^\(.*\)$/;

	return re.test(path);
}

function isAllowedNameForURL(path: string): boolean {
	const re = /^[A-Za-z0-9_.~-]*$/;
	return re.test(path);
}

function extractNameFromPath(path: string): string | null {
	const re = /\b[A-Za-z0-9_.~-]+\b/;
	//@ts-ignore Regex will return string or null, but not array
	const res = path.match(re);
	return res ? res[0] : null;
}

function extractRegexFromPath(path: string, convertToRegEXP: true): RegExp | null;
function extractRegexFromPath(path: string): string | null;
function extractRegexFromPath(path: string, convertToRegEXP?: boolean): string | RegExp | null {
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
}

function extractBodyFromRegexAsString(regex: RegExp | string): string {
	const str = regex.toString();
	return str.replace(/^\/\^?/, "").replace(/\$?\/$/, "");
}

function getPathSchema(path: string): ChildRouteSchema {
	if (path === "/") {
		return [{ name: "/" }];
	}

	const RegexEmptyError = (seg: string): void => {
		logger.error(
			`Got empty regexp value from path segment ${seg} of path ${path}. Regexp should not contains empty values.`,
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
				const name = extractNameFromPath(seg);
				if (name) {
					data.name = name;
					const regexp = extractRegexFromPath(seg, true);
					if (regexp) {
						data.regexp = {
							regexp: regexp,
							str: extractBodyFromRegexAsString(regexp),
						};
					} else RegexEmptyError(seg);
				}
			} else if (isRegexPath(seg)) {
				const regexp = extractRegexFromPath(seg, true);
				if (regexp && `${regexp}`.length > 0) {
					data.regexp = {
						regexp: regexp,
						str: extractBodyFromRegexAsString(regexp),
					};
				} else {
					RegexEmptyError(seg);
				}
			} else if (isDynamicPath(seg)) {
				data.parameter = true;
				data.name = extractNameFromPath(seg);
			} else if (isAllowedNameForURL(seg)) {
				data.name = extractNameFromPath(seg);
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
}

function getRouteParameters(params: any[], req: NactRequest): any[] {
	const result = [];
	for (let i = 0; i < params.length; i++) {
		const param = params[i];
		if (typeof param === "function") {
			result.push(param(req));
		}
	}
	return result;
}

function getControllerPath(instance: any): string | null {
	return Reflect.getOwnMetadata(CONTROLLER_ROUTER__NAME, instance) ?? null;
}

function getRouteConfig(target: any, descriptorKey?: string): NactRouteConfig | undefined {
	if (isInitializedClass(target)) {
		if (descriptorKey) {
			return Reflect.getMetadata(ROUTE__CONFIG, (target as any)[descriptorKey] ?? {});
		} else {
			const classProto = Object.getPrototypeOf(target).constructor;
			return Reflect.getMetadata(ROUTE__CONFIG, classProto);
		}
	} else if (isClassInstance(target)) {
		if (descriptorKey) {
			return Reflect.getMetadata(ROUTE__CONFIG, (target as any)[descriptorKey]);
		} else {
			return Reflect.getMetadata(ROUTE__CONFIG, target as any);
		}
	}
	return Reflect.getMetadata(ROUTE__CONFIG, target);
}

function setRouteConfig(config: NactRouteConfig, target: any, descriptorKey?: string): void {
	if (isInitializedClass(target)) {
		if (descriptorKey) {
			Reflect.defineMetadata(ROUTE__CONFIG, config, (target as any)[descriptorKey]);
		} else {
			const classProto = Object.getPrototypeOf(target).constructor;
			Reflect.defineMetadata(ROUTE__CONFIG, config, classProto);
		}
	} else if (isClassInstance(target)) {
		if (descriptorKey) {
			Reflect.defineMetadata(ROUTE__CONFIG, config, (target as any)[descriptorKey]);
		} else {
			Reflect.defineMetadata(ROUTE__CONFIG, config, target);
		}
	}
}

//TODO MOVE LATER
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
		const res = (prefix + "/" + `(${regexAsString})`).toLowerCase();
		return res;
	}
	const isSlashOnly = path === "/";
	const res = (prefix + (isSlashOnly ? "" : "/") + removeSlashes(path)).toLowerCase();
	return res;
};

export {
	getPathSchema,
	getRouteParameters,
	findRouteByParams,
	diffRouteSchemas,
	getRouteData,
	getControllerPath,
	getRouteConfig,
	setRouteConfig,
	getRegexpPresets,
	addPrefixToPath,
	defaultRegexpPresets,
};
