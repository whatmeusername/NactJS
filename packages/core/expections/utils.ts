import { isClassInstance, isObject } from "../shared";
import type { HttpExpection } from "./base-http-expection.expection";

function getNamesForExpectionHandler(
	instances: ({ new (status: number, message: string): HttpExpection } | HttpExpection | string)[],
): string[] {
	const res = [];
	if (instances) {
		for (let i = 0; i < instances.length; i++) {
			const instance = instances[i];
			if (typeof instance === "string") {
				res.push(instance);
			} else if (isClassInstance(instance)) {
				res.push(instance.name);
			}
		}
	}
	return res;
}

function isExpectionObject(expection: any): expection is { statusCode: number; message: string } {
	return (
		isObject(expection) &&
		expection?.message !== undefined &&
		typeof expection?.message === "string" &&
		!expection.statusCode !== undefined &&
		!expection.statusCode !== null &&
		typeof expection.statusCode === "number"
	);
}

export { getNamesForExpectionHandler, isExpectionObject };
