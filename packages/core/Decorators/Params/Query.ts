import { createRouteParamDecorator } from "../Utils";
import { NactRequest } from "../../index";

function Query(...params: string[]) {
	return createRouteParamDecorator(function (req: NactRequest): { [K: string]: any } {
		const query = req.getURLData().query;
		if (params.length > 0) {
			const res: { [K: string]: any } = {};
			for (let i = 0; i < params.length; i++) {
				let param: string = params[i];
				if (param.endsWith("[]")) {
					param = param.slice(0, param.length - 2);
					res[param] = query.getAll(param);
				} else {
					res[param] = query.get(param);
				}
			}
			return res;
		}
		return req.getURLData().query;
	});
}

export { Query };
