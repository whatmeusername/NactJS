import type { NactConfigItem } from "../routing";
import { isClassInstance, isInitializedClass } from "../shared";
import type { HttpExpectionHandler } from "./base-http-expection-handler.handler";
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

function mapHandlers(
	handlers: ({ new (): HttpExpectionHandler } | HttpExpectionHandler)[],
	storeAt: NactConfigItem[],
): NactConfigItem[] {
	for (let i = 0; i < handlers.length; i++) {
		const handler = handlers[i];
		let inject = false;
		let name = "";
		const isInitialized = isInitializedClass(handler);
		if (!isInitialized) {
			inject = true;
			name = (handler as { new (): any }).name;
		} else {
			inject = false;
			name = (handler as new () => any).constructor.name;
		}
		storeAt.push({
			name: name,
			inject: inject,
			instance: handler as any,
		});
	}
	return storeAt;
}

export { getNamesForExpectionHandler, mapHandlers };
