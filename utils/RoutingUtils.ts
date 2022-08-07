import type { ChildRouteSchema } from '../index';

import { ROUTE__STATUS__CODE, ROUTE__CONTENT__TYPE } from '../router.const';
import type NactRequest from '../request';
import type { NactRouteResponse, RouteChild } from '../index';

const isDynamicPathSegment = (path: string): boolean => {
    return path.startsWith(':');
};

const parseNameFromDynamic = (path: string): string => {
    return path.slice(1);
};

const getPathSchema = (string: string): ChildRouteSchema => {
    if (string === '/') {
        return ['/'];
    }

    const res: ChildRouteSchema = [];
    let spliited = string.split('/');
    spliited.forEach((seg) => {
        if (isDynamicPathSegment(seg)) res.push({ name: parseNameFromDynamic(seg) });
        else res.push(seg);
    });
    return res;
};

function getRouteParameters(route: RouteChild, params: string[], req: NactRequest): any | null {
    let result = [];
    for (let i = 0; i < params.length; i++) {
        const param = params[i];
        if (param === 'query') {
            result.push(req.urldata.query);
        } else if (param === 'param') {
            const routeParams: { [K: string]: any } = {};
            let regPathSchema = req.urldata.params;
            regPathSchema = regPathSchema.slice(regPathSchema.length - route.schema.length);
            for (let i = 0; i < regPathSchema.length; i++) {
                let param = regPathSchema[i];
                let routeParam = route.schema[i];
                if (typeof routeParam === 'object') {
                    routeParams[routeParam.name] = param;
                }
            }
            result.push(routeParams);
        } else if (param === 'req') {
            result.push(req);
        } else if (param === 'ip') {
            result.push(req.ip);
        }
    }
    return result;
}

function HandleRouteResponse(body: any, descriptor: TypedPropertyDescriptor<any>, req: NactRequest): NactRouteResponse {
    let response: NactRouteResponse = { body: body };
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
