import { createParamRoute } from '../Utils';
import NactRequest from '../../request';
import { RouteChild } from '../../index';

const Param = createParamRoute(function (req: NactRequest) {
    const route = req.route as RouteChild;
    const routeParams: { [K: string]: any } = {};
    let requestPathSchema = req.urldata.params;
    requestPathSchema = requestPathSchema.slice(requestPathSchema.length - route.schema.length);
    for (let i = 0; i < requestPathSchema.length; i++) {
        let param = requestPathSchema[i];
        let routeParam = route.schema[i];
        if (typeof routeParam === 'object') {
            routeParams[routeParam.name] = param;
        }
    }
    return routeParams;
});

export default Param;
