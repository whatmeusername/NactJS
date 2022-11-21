import { isClassInstance } from "../shared";
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

export { getNamesForExpectionHandler };
