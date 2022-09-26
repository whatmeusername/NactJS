function isInitializedClass(object: any): boolean {
	return object && isClassInstance(object) && typeof object === "object";
}

function isClassInstance(object: any): boolean {
	return (
		object?.prototype?.constructor?.toString().substring(0, 5) === "class" ||
		object?.constructor?.toString().substring(0, 5) === "class"
	);
}

function isUndefined(object: any): object is undefined {
	return object === undefined;
}

function isNull(object: any): object is null {
	return object === null;
}

function isDefined(object: any): object is any {
	return !isUndefined(object) && !isNull(object);
}

function isObject(object: any): object is { [K: string]: any } {
	return isDefined(object) && typeof object === "object";
}

export { isInitializedClass, isClassInstance, isObject, isDefined, isNull, isUndefined };
