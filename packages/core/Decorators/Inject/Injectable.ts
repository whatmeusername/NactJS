import { INJECTABLE_WATERMARK } from "../../nact-constants/index";

function setInjectableWatermark(target: object): void {
	Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
}

function Injectable() {
	return function (target: object) {
		setInjectableWatermark(target);
	};
}

function getInjectabkeWaterMark(classInstance: any) {
	return Reflect.getMetadata(INJECTABLE_WATERMARK, classInstance);
}

export { Injectable, setInjectableWatermark };
export { getInjectabkeWaterMark };
