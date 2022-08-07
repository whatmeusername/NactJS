import { ROUTE__PARAMETER__METADATA, ROUTE__PATH, ROUTE__METHOD } from '../router.const';
import NactLogger from '../logger';

import { getPathSchema } from '../utils/RoutingUtils';
import { removeSlashes } from '../utils/Other';

import type { RouteChild } from '../index';

const getRouteData = (
    path: string,
    target: Function,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<any>
): RouteChild => {
    const clearedPath = removeSlashes(path);
    const pathSchema = getPathSchema(clearedPath);
    let isAbsolute = false;

    const dynamicIndexes: number[] = [];
    pathSchema.forEach((seg, index) => {
        if (seg === null) {
            dynamicIndexes.push(index);
            isAbsolute = true;
        }
    });
    return {
        path: clearedPath,
        name: propertyKey,
        method: 'GET',
        absolute: isAbsolute,
        schema: pathSchema,
        dynamicIndexes: dynamicIndexes,
    };
};

const setMethodForRoute = (descriptor: TypedPropertyDescriptor<any>, method: string, path: string): void | null => {
    const routeMethod = Reflect.getMetadata(ROUTE__METHOD, descriptor);
    const pathMethod = Reflect.getMetadata(ROUTE__PATH, descriptor);
    if (!routeMethod && !pathMethod) {
        Reflect.defineMetadata(ROUTE__METHOD, 'GET', descriptor);
        Reflect.defineMetadata(ROUTE__PATH, path, descriptor);
    } else if (routeMethod !== method || pathMethod !== path) {
        const logger = new NactLogger();
        logger.error(`Routes can have only one path, but route with path "${pathMethod}" got another path "${path}"`);
    }
};

function setMetaData(target: any, routeKey: string, key: string, value: string): any {
    let currentMetaData = Reflect.getMetadata(ROUTE__PARAMETER__METADATA, target.constructor, routeKey);
    if (currentMetaData) {
        let propertyExists = currentMetaData[key];
        if (propertyExists) {
            currentMetaData[key].unshift(value);
        } else {
            currentMetaData[key] = [value];
        }
    } else {
        return { [key]: [value] };
    }
    return currentMetaData;
}

function setParameterValue(paramKey: string) {
    return function (target: any, key: string): any {
        Reflect.defineMetadata(
            ROUTE__PARAMETER__METADATA,
            setMetaData(target, key, 'params', paramKey),
            target.constructor,
            key
        );
    };
}

export { setParameterValue, setMethodForRoute, getRouteData };
