import { ClassInst } from "../routing";

function isInitializedClass(object: any): boolean {
	return object && isClassInstance(object) && typeof object === "object";
}

function isClassInstance(object: any): object is ClassInst {
	return (
		object?.prototype?.constructor?.toString().substring(0, 5) === "class" ||
		object?.constructor?.toString().substring(0, 5) === "class"
	);
}

function isFunction(value: any): value is (...args: any[]) => any {
	return typeof value === "function";
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

const isUppercase = (value: string): value is string => {
	return value[0] === value[0].toUpperCase();
};

const isString = (value: any): value is string => {
	return typeof value === "string";
};

const removeSlashes = (string: string): string => {
	if (string !== "/") {
		if (string[0] === "/") string = string.slice(1);
		if (string[string.length - 1] === "/") string = string.slice(0, string.length - 1);
	}
	return string;
};

export {
	isInitializedClass,
	isClassInstance,
	isFunction,
	isObject,
	isDefined,
	isNull,
	isUndefined,
	isUppercase,
	isString,
	removeSlashes,
};
