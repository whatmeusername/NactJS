import { CONTROLLER_ROUTER__NAME, CONTROLLER__WATERMARK } from "../../nact-constants";

function Controller(path = "/"): any {
	return function (target: () => any) {
		Reflect.defineMetadata(CONTROLLER_ROUTER__NAME, path, target);
		Reflect.defineMetadata(CONTROLLER__WATERMARK, true, target);

		return target;
	};
}

export { Controller };
