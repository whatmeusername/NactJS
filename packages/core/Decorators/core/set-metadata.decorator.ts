function setMetadata(
	key: string,
	value: any,
): (target: object, propertyKey?: string, descriptor?: PropertyDescriptor) => void {
	return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
		if (!descriptor) {
			Reflect.defineMetadata(key, value, target);
		} else {
			Reflect.defineMetadata(key, value, descriptor.value);
		}
	};
}

export { setMetadata };
