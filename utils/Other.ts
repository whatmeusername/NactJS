const isUppercase = (value: string): boolean => {
	return value[0] === value[0].toUpperCase();
};

const isDefined = (value: any): boolean => {
	return value !== null && value !== undefined && value !== "" && typeof value === "string" && value.trim() !== "";
};

const isString = (value: any): boolean => {
	return typeof value === "string";
};

const removeSlashes = (string: string): string => {
	if (string !== "/") {
		if (string[0] === "/") string = string.slice(1);
		if (string[string.length - 1] === "/") string = string.slice(0, string.length - 1);
	}
	return string;
};

export { isUppercase, removeSlashes, isString, isDefined };
