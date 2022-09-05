import type { ChildRouteSchema, ChildRouteSchemaSegment } from "../../app";

import { ROUTE__STATUS__CODE, ROUTE__CONTENT__TYPE } from "../core/nact-constants/index";
import type { NactRequest } from "../core/nact-request/request";
import type { NactRouteResponse, RouteChild } from "../../app";

const isDynamicPathSegment = (path: string): boolean => {
	return path.startsWith(":");
};

const isOptionalPathSegment = (path: string): boolean => {
	return path.endsWith("?");
};

const parseNameFromDynamic = (path: string): string => {
	let res = isDynamicPathSegment(path) ? path.slice(1) : path;
	res = isOptionalPathSegment(res) ? res.slice(0, res.length - 1) : res;
	return res;
};

const getPathSchema = (string: string): ChildRouteSchema => {
	if (string === "/") {
		return ["/"];
	}

	const res: ChildRouteSchema = [];
	const spliited = string.split("/");
	spliited.forEach((seg) => {
		if (isDynamicPathSegment(seg)) {
			const data: ChildRouteSchemaSegment = { name: parseNameFromDynamic(seg) };
			if (isOptionalPathSegment(seg)) {
				data.optional = true;
			}
			res.push(data);
		} else res.push(seg);
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

export { isDynamicPathSegment, getPathSchema, getRouteParameters, HandleRouteResponse };
