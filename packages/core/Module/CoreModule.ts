import { setInjectableWatermark } from "../decorators/index";
import { NactModule } from "./Module";
import type { ProviderData } from "./interfaces";

class CoreModule extends NactModule {
	constructor(transferModuleKey?: string) {
		super({}, transferModuleKey);
	}

	public appendProvider(provider: any): ProviderData | undefined;
	public appendProvider(provider: any[]): ProviderData[] | undefined;
	public appendProvider(provider: any): ProviderData | undefined | ProviderData[] {
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
