import { isInitializedClass, isClassInstance } from "../shared/index";

class Reflector {
	static get(key: string, target: any): any {
		const isClass = isClassInstance(target);
		if (isClass) {
			if (isInitializedClass(target)) {
				return Reflect.getMetadata(key, target.constructor);
			} else {
				return Reflect.getMetadata(key, target);
			}
		}
	}
}

export { Reflector };
