import { setInjectableWatermark } from "../decorators/index";
import { NactModule } from "./module";
import type { ProviderData } from "./interfaces";

class CoreModule extends NactModule {
	constructor(transferModuleKey?: string) {
		super({}, transferModuleKey);
	}

	appendProvider(provider: any): ProviderData | undefined;
	appendProvider(provider: any[]): ProviderData[] | undefined;
	appendProvider(provider: any): ProviderData | undefined | ProviderData[] {
		if (provider) {
			if (Array.isArray(provider)) {
				const res: ProviderData[] = [];
				provider.forEach((provider) => {
					if (provider) {
						setInjectableWatermark(provider);
						res.push(this.__registerProvider(provider) as ProviderData);
					}
				});
			} else {
				setInjectableWatermark(provider);
				return this.__registerProvider(provider) as ProviderData;
			}
		}
	}
}

export default CoreModule;
