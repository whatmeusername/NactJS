import { isInitializedClass } from "../shared/index";

class Reflector {
	public static get(key: string, target: any): any {
		return Reflect.getMetadata(key, isInitializedClass(target) ? target.constructor : target);
	}
}

export { Reflector };
