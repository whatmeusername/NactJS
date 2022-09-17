import { setInjectableWatermark } from "../Decorators/index";
import { NactModule } from "./Module";
import type { ProviderData } from "./interfaces";

class CoreModule extends NactModule {
	constructor(transferModuleKey?: string) {
		super({}, transferModuleKey);
	}

	appendProvider(provider: any): ProviderData | undefined {
		if (provider) {
			setInjectableWatermark(provider);
			return this.__registerProvider(provider) as ProviderData;
		}
	}
}

export default CoreModule;
