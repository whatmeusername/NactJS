import { isInitializedClass } from "../shared/index";

class Reflector {
	static get(key: string, target: any): any {
		if (isInitializedClass(target)) {
			return Reflect.getMetadata(key, target.constructor);
		}
		return Reflect.getMetadata(key, target);
	}
}

export { Reflector };
