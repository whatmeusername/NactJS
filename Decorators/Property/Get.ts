import { ARG_TO_CALL_DESCRIPTOR_OPTIONS, ROUTE__PARAMS, ROUTE__PARAMETER__METADATA } from '../../router.const';

import { setMethodForRoute, getRouteData } from '../Utils';
import { HandleRouteResponse, getRouteParameters } from '../../utils/RoutingUtils';
import type NactRequest from '../../request';

function Get(path: string): any {
    return function (
        target: Function,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<any>
    ): TypedPropertyDescriptor<any> {
        let descriptorMethod = descriptor.value as Function;
        setMethodForRoute(descriptor, 'GET', path);

        descriptor.value = function (isDescriptorCall?: string, request?: NactRequest) {
            const routeData = getRouteData(path, target, propertyKey, descriptor);
            if (isDescriptorCall === ARG_TO_CALL_DESCRIPTOR_OPTIONS) {
                return routeData;
            } else if (request) {
                let routeMetadata = Reflect.getMetadata(ROUTE__PARAMETER__METADATA, target.constructor, propertyKey);
                let methodParamsVariables: any[] = [];

                if (routeMetadata) {
                    let methodParams = routeMetadata[ROUTE__PARAMS] ?? [];
                    methodParamsVariables = getRouteParameters(routeData, methodParams, request);
                }

                const response = descriptorMethod.apply(this, [...methodParamsVariables]);
                return HandleRouteResponse(response, descriptor, request);
            }
        };

        return descriptor;
    };
}

export default Get;
