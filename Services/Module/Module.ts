import { INJECTABLE_WATERMARK, INJECTABLE_UNIQUE_TOKEN, MODULE__WATERMARK } from "../module.consts";
import { CONTROLLER__WATERMARK } from "../../router.const";
import { getNactLogger } from "../../logger";

interface ConstructorParam {
	name: string;
	index: number;
	type: string;
}

interface ConstructorData {
	params: ConstructorParam[];
	count: number;
}

interface ProviderData {
	instance: any;
	name: string;
	uniqueToken: string;
	constructorParams: ConstructorData;
}

interface ControllerData {
	instance: any;
	name: string;
	constructorParams: ConstructorData;
}

interface ExportData {
	name: string;
}

interface NactModuleSettings {
	providers?: any[];
	controllers?: any[];
	import?: any[];
	export?: any[];
}

const NactLogger = getNactLogger();

function isClassInstance(object: any): boolean {
	return object.prototype?.constructor?.toString().substring(0, 5) === "class";
}

function isInjectable(object: any): boolean {
	return Reflect.getMetadata(INJECTABLE_WATERMARK, object) ? true : false;
}

function isController(object: any): boolean {
	return Reflect.getMetadata(CONTROLLER__WATERMARK, object) ? true : false;
}

let NactTransferModuleInstance: NactTransferModule;
function createTransferModule(modules?: NactModule[]) {
	NactTransferModuleInstance = new NactTransferModule(modules ?? []);
	return NactTransferModuleInstance;
}

function getTransferModule(): NactTransferModule {
	return NactTransferModuleInstance;
}

class NactTransferModule {
	protected readonly __modules: NactModule[];
	protected readonly __exports: ProviderData[];
	constructor(modules: NactModule[]) {
		this.__modules = modules;
		this.__exports = [];
	}

	__append(module: NactModule): void {
		if (module?.__getModuleToken()?.startsWith("module")) {
			this.__modules.push(module);
		}
		console.log(this);
	}

	__getExports(module: NactModule) {}

	resolveModuleImports(module: NactModule): void {}
}

function setModuleWaterMark(module: NactModule): void {
	Reflect.deleteMetadata(MODULE__WATERMARK, module);
}

class NactModule {
	protected readonly __moduleToken: string;
	import: ProviderData[];
	export: ExportData[];
	providers: any[];
	controllers: ControllerData[];

	constructor(settings: NactModuleSettings) {
		this.__moduleToken = this.getUniqueToken("module");

		this.providers = [];
		this.controllers = [];
		this.import = [];
		this.export = [];

		this.loadProviders(settings?.providers ?? []);
		this.loadControllers(settings?.controllers ?? []);
		setModuleWaterMark(this);
	}

	__getModuleToken(): string {
		return this.__moduleToken;
	}

	getUniqueToken(prefix?: string): string {
		return (
			(prefix ? `${prefix}-` : "") + Math.random().toString(36).slice(5) + "-" + Math.random().toString(36).slice(5)
		);
	}

	setUniqueToken(object: any, prefix?: string) {
		if (!this.isRegistered(object)) {
			const randomToken = this.getUniqueToken(prefix);
			Reflect.defineMetadata(INJECTABLE_UNIQUE_TOKEN, randomToken, object);
			return randomToken;
		} else {
			// TODO: THROW ERROR if
		}
	}

	isRegistered(object: any) {
		return Reflect.getMetadata(INJECTABLE_UNIQUE_TOKEN, object) ? true : false;
	}

	getConstructorParametersData(provider: any): ConstructorData {
		const types = Reflect.getMetadata("design:paramtypes", provider);
		const res: ConstructorData = { params: [], count: 0 };
		if (types) {
			for (let i = 0; i < types.length; i++) {
				const paramType = types[i];
				if (paramType === undefined) {
					NactLogger.error(
						`Cannot resolve constructor parameter of class "${provider.name}" with index ${i}, because of "${paramType}" value. Maybe is circular dependency, that not cant be handled.`
					);
					break;
				} else if (!isClassInstance(paramType)) {
					NactLogger.warning(
						`Parameter of class constructor "${provider.name}" with type "| ${paramType} |" and index ${i} will not be injected due is not class instance.`
					);
				} else if (isClassInstance(paramType)) {
					res.params.push({ name: paramType.name, index: i, type: "class" });
				}
				res.count += 1;
			}
		}
		return res;
	}

	loadProviders(providers: any[]) {
		const isRegisteredProvider = (providerName: string): ProviderData | undefined => {
			return this.providers.find((provider) => provider.name === providerName);
		};

		function getProviderParams(provider: ProviderData): Array<any> {
			const constructorParams: any[] = [];

			if (provider.constructorParams.count > 0) {
				for (let i = 0; i < provider.constructorParams.count; i++) {
					const constructorParam = provider.constructorParams.params.find((param) => param.index === i);
					if (constructorParam) {
						const registeredProvider = isRegisteredProvider(constructorParam.name);
						if (registeredProvider) {
							constructorParams.push(registeredProvider.instance);
						} else {
							const ProviderDepency = providers.find((provider) => provider.name === constructorParam.name);
							if (ProviderDepency) {
								constructorParams.push(registerProvider(ProviderDepency)?.instance);
							} else {
								NactLogger.error(
									`Nact is missing depending provider "${constructorParam.name} (index: ${constructorParam.index})" "for provider "${provider.name}". Its must be passed as provider or must imported from other module.`
								);
							}
						}
					} else constructorParams.push(undefined);
				}
			}
			return constructorParams;
		}

		function resolveProviderInstance(provider: ProviderData, instance: any) {
			let constructorParams = [];
			if (provider.constructorParams.params.length > 0) {
				constructorParams = getProviderParams(provider);
			}
			provider.instance = new instance(...constructorParams);
		}

		const registerProvider = (provider: any) => {
			if (isInjectable(provider)) {
				if (isClassInstance(provider)) {
					if (!this.isRegistered(provider)) {
						const providerData: ProviderData = {} as ProviderData;

						providerData.constructorParams = this.getConstructorParametersData(provider);
						providerData.name = provider.name;
						providerData.uniqueToken = this.setUniqueToken(provider) as string;

						resolveProviderInstance(providerData, provider);

						this.providers.push(providerData);
						return providerData;
					}
				}
			}
		};

		for (let i = 0; i < providers.length; i++) {
			const provider = providers[i];
			registerProvider(provider);
		}
	}

	loadControllers(controllers: any[]) {
		const getControllerParams = (controllerData: ControllerData) => {
			const params: any = [];
			if (controllerData.constructorParams.count > 0) {
				for (let i = 0; i < controllerData.constructorParams.count; i++) {
					const constructorParam = controllerData.constructorParams.params[i];
					const provider = this.providers.find((provider) => provider.name === constructorParam.name);
					if (provider) {
						params.push(provider.instance);
					} else {
						NactLogger.error(
							`Cannot resolve provider with name "${constructorParam.name} (index: ${constructorParam.index})" for contorller "${controllerData.name}". Nact not found provider`
						);
					}
				}
			}
			return params;
		};

		function resolveControllerInstance(provider: ControllerData, instance: any) {
			let constructorParams = [];
			if (provider.constructorParams.params.length > 0) {
				constructorParams = getControllerParams(provider);
			}
			provider.instance = new instance(...constructorParams);
		}

		const registerController = (controller: any) => {
			if (isController(controller)) {
				if (!isInjectable(controller)) {
					const controllerData: ProviderData = {} as ProviderData;
					controllerData.constructorParams = this.getConstructorParametersData(controller);
					controllerData.name = controller.name;
					resolveControllerInstance(controllerData, controller);

					this.controllers.push(controllerData);
				} else {
					NactLogger.error(
						`Controllers not allowed to be injectable as same time, but controller "${controller.name}" has injectable flag on.`
					);
				}
			} else {
				NactLogger.warning(
					`Controller instance must have controller flag on, but got "${controller.name}" without it. (Instance has been passed)`
				);
			}
		};
		for (let i = 0; i < controllers.length; i++) {
			const controller = controllers[i];
			registerController(controller);
		}
	}

	// ---- IMPORT -----
	isImportAvailable(imports: any[]) {}
}

function createModule(settings: NactModuleSettings) {
	const newModule = new NactModule(settings);
	(getTransferModule() ?? createTransferModule()).__append(newModule);
	return newModule;
}

export type { NactModule, NactTransferModule };
export { getTransferModule };
export default createModule;
