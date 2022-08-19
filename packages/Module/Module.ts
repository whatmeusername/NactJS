import { INJECTABLE_UNIQUE_TOKEN } from "../nact-constants/index";
import { getNactLogger } from "../nact-logger/index";

import { createTransferModule, getTransferModule } from "./index";
import type { ConstructorData, ProviderData, ControllerData, ExportData, NactModuleSettings } from "./index";
import {
	isClassInstance,
	isInjectable,
	isController,
	isAllProviderResolved,
	setModuleWaterMark,
	getParamTypes,
} from "./utils";

const NactLogger = getNactLogger();

class NactModule {
	protected readonly __moduleToken: string;
	readonly __moduleSettings: NactModuleSettings | null;
	__isInited: boolean;

	import: any[];
	export: ExportData[];
	providers: ProviderData[];
	controllers: ControllerData[];

	constructor(settings: NactModuleSettings) {
		this.__moduleToken = this.getUniqueToken("module");
		this.__moduleSettings = settings;
		this.__isInited = false;

		this.providers = [];
		this.controllers = [];
		this.import = [];
		this.export = [];
	}

	_startInit(settings?: NactModuleSettings) {
		if (!settings) settings = this.__moduleSettings as NactModuleSettings;

		if (settings && this.__isInited === false) {
			this.loadProviders(settings?.providers ?? []);
		}
	}

	__endInit(): void {
		if (isAllProviderResolved(this)) {
			this.loadControllers(this.__moduleSettings?.controllers ?? []);
			setModuleWaterMark(this);

			//@ts-ignore// Module Settings should exist till module will be impleted
			this.__moduleSettings = null;
			this.__isInited = true;
		}
	}

	// ---- General ----
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
		const types = getParamTypes(provider);
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
	// =================

	// --- Providers ---

	getProvider(providerName: string): ProviderData | undefined {
		return this.providers.find((provider) => provider.name === providerName);
	}

	getProviderParams(provider: ProviderData): Array<any> {
		const constructorParams: any[] = [];

		if (provider.constructorParams.count > 0) {
			for (let i = 0; i < provider.constructorParams.count; i++) {
				const constructorParam = provider.constructorParams.params.find((param) => param.index === i);
				if (constructorParam) {
					const registeredProvider = this.getProvider(constructorParam.name);
					if (registeredProvider) {
						constructorParams.push(registeredProvider.instance);
					} else {
						const ProviderDepency = this.__moduleSettings?.providers?.find(
							(provider) => provider.name === constructorParam.name
						);
						if (ProviderDepency) {
							constructorParams.push(this.registerProvider(ProviderDepency)?.instance);
						} else {
							const ImportedDepency = this.import?.find((provider) => provider.name === constructorParam.name);
							if (ImportedDepency) {
								constructorParams.push(ImportedDepency.instance);
							} else {
								NactLogger.error(
									`Nact is missing depending provider "${constructorParam.name} (index: ${constructorParam.index})" "for provider "${provider.name}". Its must be passed as provider or must imported from other module.`
								);
							}
						}
					}
				} else constructorParams.push(undefined);
			}
		}
		return constructorParams;
	}

	resolveProviderInstance(provider: ProviderData, instance: any) {
		let constructorParams = [];
		if (provider.constructorParams.params.length > 0) {
			constructorParams = this.getProviderParams(provider);
		}
		provider.instance = new instance(...constructorParams);
	}

	isUsingUnresolvedImports(provider: any): boolean {
		let res = false;

		const providerNames: string[] = [];
		const paramsNames: string[] = [];

		this.getConstructorParametersData(provider).params.forEach((type) => {
			paramsNames.push(type.name);
		});

		this.__moduleSettings?.providers?.forEach((provider) => providerNames.push(provider.name));

		paramsNames.forEach((name) => {
			if (!providerNames.includes(name)) {
				res = this.import.find((imp) => imp.name === name && imp.resolved === false) !== undefined;
			}
		});
		return res;
	}

	updateProvider(providerToken: string): ProviderData | null {
		const providerToUpdate = this.providers.find((provider) => provider.uniqueToken === providerToken);
		if (providerToUpdate) {
			const providerInitialClass = this.__moduleSettings?.providers?.find(
				(provider) => provider.name === providerToUpdate.name
			);
			if (providerInitialClass) {
				if (!this.isUsingUnresolvedImports(providerInitialClass)) {
					providerToUpdate.constructorParams = this.getConstructorParametersData(providerInitialClass);
					this.resolveProviderInstance(providerToUpdate, providerInitialClass);
					return providerToUpdate;
				}
			}
		}
		return null;
	}

	registerProvider = (provider: any) => {
		if (isInjectable(provider)) {
			if (isClassInstance(provider)) {
				if (!this.getProvider(provider.name)) {
					const canNotBeResolved = this.isUsingUnresolvedImports(provider);

					const providerData: ProviderData = {} as ProviderData;

					providerData.name = provider.name;
					providerData.uniqueToken = this.setUniqueToken(provider, "provider") as string;

					if (!canNotBeResolved) {
						providerData.constructorParams = this.getConstructorParametersData(provider);
						this.resolveProviderInstance(providerData, provider);
					}

					this.providers.push(providerData);

					getTransferModule().__providersLocator.push({
						name: provider.name,
						moduleKey: this.__getModuleToken(),
						key: providerData.uniqueToken,
						resolved: !canNotBeResolved,
						instance: !canNotBeResolved ? providerData.instance : null,
					});

					return providerData;
				}
			}
		}
	};

	loadProviders(providers: any[]) {
		for (let i = 0; i < providers.length; i++) {
			const provider = providers[i];
			this.registerProvider(provider);
		}
	}

	// --- Controllers ---

	registerController(controller: any) {
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
	}

	loadControllers(controllers: any[]) {
		for (let i = 0; i < controllers.length; i++) {
			const controller = controllers[i];
			this.registerController(controller);
		}
	}

	// ---- EXPORT -----
	loadExports(exports: any[]) {
		for (let i = 0; i < exports.length; i++) {
			const exportInstanceName = exports[i].name;
			if (exportInstanceName) {
				const exportedProvider: ProviderData | undefined = this.__moduleSettings?.providers?.find(
					(provider) => provider.name === exportInstanceName
				);
				if (exportedProvider) {
					const providerExportData: ExportData = { name: exportInstanceName, key: exportedProvider.uniqueToken };
					this.export.push(providerExportData);
				}
			}
		}
	}
}

function createModule(settings: NactModuleSettings) {
	const newModule = new NactModule(settings);
	(getTransferModule() ?? createTransferModule())._append(newModule);
	return newModule;
}

export { createModule, NactModule };
