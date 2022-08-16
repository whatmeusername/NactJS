import { INJECTABLE_WATERMARK } from "../module.consts";

function Injectable() {
	return function (target: object) {
		Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
	};
}

function getInjectabkeWaterMark(classInstance: any) {
	return Reflect.getMetadata(INJECTABLE_WATERMARK, classInstance);
}

export default Injectable;
export { getInjectabkeWaterMark };
