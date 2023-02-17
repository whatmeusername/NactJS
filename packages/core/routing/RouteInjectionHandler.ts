import { getTransferModule } from "../module";
import { getRouteConfig, setRouteConfig } from "./utils";

import type { NactRouteConfig, NactRouteWare } from "./interface";

function handleRouteDataInjections(target: any, descriptorKey?: string): NactRouteConfig | undefined {
	if (!target) return {};

	const routeConfig: NactRouteConfig | undefined = getRouteConfig(target, descriptorKey);
	if (routeConfig) {
		const routeConfigValues: NactRouteWare[] = Object.values(routeConfig) as NactRouteWare[];
		for (let i = 0; i < routeConfigValues.length; i++) {
			const configItems = routeConfigValues[i]?.fns ?? [];
			for (let j = 0; j < configItems.length; j++) {
				const configItem = configItems[i];
				if (typeof configItem === "object" && configItem?.inject === true) {
					const tm = getTransferModule();
					const coreModule = tm.getCoreModule();
					if (coreModule) {
						let existedProvider = coreModule.getProvider(configItem.instance);
						if (!existedProvider) {
							existedProvider = coreModule.appendProvider(configItem.instance);
						}
						if (existedProvider?.isReady) {
							configItem.instance = existedProvider.instance;
						}
					}
				}
			}
		}
		setRouteConfig(routeConfig, target, descriptorKey);
	}
	return routeConfig;
}

export { handleRouteDataInjections };
