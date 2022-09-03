import {
	INJECTABLE_WATERMARK,
	MODULE__WATERMARK,
	CONTROLLER__WATERMARK,
	PROPERTY_DEPENDENCIES,
} from "../nact-constants/index";
import type { ParameterData, ConstructorData, NactCustomProvider, ProviderData, NactModule } from "./index";
import { CUSTOM_PROVIDER_TOKEN, ROOT_MODULE_TOKEN, MODULE_TOKEN } from "./index";
import { getNactLogger } from "../nact-logger/index";

const NactLogger = getNactLogger();

function isClassInstance(object: any): boolean {
	return (
		object?.prototype?.constructor?.toString().substring(0, 5) === "class" ||
		object?.constructor?.toString().substring(0, 5) === "class"
	);
}

function isUndefined(value: any): boolean {
	return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function isInitializedClass(object: any): boolean {
	return object && isClassInstance(object) && typeof object === "object";
}

function isRootModule(module: NactModule): boolean {
	return module?.getModuleToken()?.startsWith(ROOT_MODULE_TOKEN);
}

function isModule(module: NactModule): boolean {
	return module?.getModuleToken()?.startsWith(MODULE_TOKEN);
}

function isCustomProvider(provider: any): boolean {
	return typeof provider === "object" && provider?.uniqueToken?.startsWith(CUSTOM_PROVIDER_TOKEN);
}

function isInjectable(object: any): boolean {
	return Reflect.getMetadata(INJECTABLE_WATERMARK, object) ? true : false;
}

function isController(object: any): boolean {
	return Reflect.getMetadata(CONTROLLER__WATERMARK, object) ? true : false;
}

function moduleHasImport(module: NactModule, importName: string): boolean {
	return module.import.find((imp) => imp.name === importName) !== undefined;
}

function isAllProviderResolved(module: NactModule) {
	const providers = module.providers;
	for (let i = 0; i < providers.length; i++) {
		const provider = providers[i];
		if (provider.instance === undefined) return false;
	}
	return true;
}

function setModuleWaterMark(module: NactModule): void {
	Reflect.defineMetadata(MODULE__WATERMARK, true, module);
}

function getParamTypes(object: any): any[] {
	return Reflect.getMetadata("design:paramtypes", object);
}

function getUniqueToken(prefix?: string): string {
	return (prefix ? `${prefix}-` : "") + Math.random().toString(36).slice(5) + "-" + Math.random().toString(36).slice(5);
}

function mapCustomProviderArgs(params: any[]): ParameterData[] {
	const res: ParameterData[] = [];
	if (params) {
		for (let i = 0; i < params.length; i++) {
			const param = params[i];
			if (isClassInstance(param)) {
				res.push({ name: param.name, index: i, type: "class" });
			} else if (typeof param === "string") {
				res.push({ name: param, index: i, type: "inject" });
			}
		}
	}

	return res;
}

function getConstructorParametersData(provider: any, validateType?: boolean): ConstructorData {
	const types = getParamTypes(provider);
	const res: ConstructorData = { params: [], count: 0 };

	const injectableProperties = Reflect.getMetadata(PROPERTY_DEPENDENCIES, provider);
	if (injectableProperties) res.params = [...res.params, ...injectableProperties];

	function isInjectedProperty(index: number): boolean {
		return res.params.find((param) => param.index === index && param.type === "inject") !== undefined;
	}

	if (types) {
		for (let i = 0; i < types.length; i++) {
			const paramType = types[i];
			if (paramType === undefined && !validateType) {
				NactLogger.error(
					`Cannot resolve constructor parameter of class "${provider.name}" with index ${i}, because of "${paramType}" value. Maybe is circular dependency, that not cant be handled.`
				);
			} else if (!isInjectedProperty(i) && !isClassInstance(paramType) && !validateType) {
				NactLogger.warning(
					`Parameter of class constructor "${provider.name}" with type "| ${paramType} |" and index ${i} will not be injected due is not class instance.`
				);
			} else if (isClassInstance(paramType)) {
				res.params.push({ name: paramType.name, index: i, type: "class" });
			}
			res.count += 1;
		}
	}

	if (injectableProperties) res.params.sort((a, b) => a.index - b.index);

	return res;
}

function unpackModuleArrays(module: NactModule): void {
	if (!module.__isInited) {
		const moduleSettings = module.__moduleSettings;
		const providers = moduleSettings?.providers;

		if (providers) {
			let flattedProviders: ProviderData[] = [];
			for (let i = 0; i < providers.length; i++) {
				const provider = providers[i];
				if (Array.isArray(provider)) {
					flattedProviders = [...flattedProviders, ...provider];
				} else flattedProviders.push(provider);
			}
			moduleSettings.providers = flattedProviders;
		}
	}
}

function resolveRootCustomProviderFactory(provider: NactCustomProvider): any {
	if (provider.useFactory) {
		if (provider.injectParameters) {
			NactLogger.error("Nact root modules cant use imports or injectParameters for custom providers");
		}
		const factoryValue = provider.useFactory();
		provider.willUse = "useValue";
		if (factoryValue instanceof Promise) {
			factoryValue.then((res) => {
				provider.useValue = res;
			});
			return factoryValue;
		} else provider.useValue = factoryValue;
		delete provider.useFactory;
	}
}

export {
	isUndefined,
	isModule,
	isRootModule,
	isInitializedClass,
	isClassInstance,
	isInjectable,
	isController,
	isCustomProvider,
	moduleHasImport,
	isAllProviderResolved,
	setModuleWaterMark,
	getParamTypes,
	getUniqueToken,
	mapCustomProviderArgs,
	getConstructorParametersData,
	unpackModuleArrays,
	resolveRootCustomProviderFactory,
};
