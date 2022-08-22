import { INJECTABLE_WATERMARK } from "../../nact-constants/index";

function Injectable() {
	return function (target: object) {
		Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
	};
}

function getInjectabkeWaterMark(classInstance: any) {
	return Reflect.getMetadata(INJECTABLE_WATERMARK, classInstance);
}

export { Injectable };
export { getInjectabkeWaterMark };
