function isInitializedClass(object: any): boolean {
	return object && isClassInstance(object) && typeof object === "object";
}

function isClassInstance(object: any): boolean {
	return (
		object?.prototype?.constructor?.toString().substring(0, 5) === "class" ||
		object?.constructor?.toString().substring(0, 5) === "class"
	);
}

export { isInitializedClass, isClassInstance };
