import { INJECTABLE_UNIQUE_TOKEN, PROPERTY_DEPENDENCIES } from "../nact-constants/index";
import { getNactLogger } from "../nact-logger/index";

import {
	getTransferModule,
	isClassInstance,
	isInitializedClass,
	isInjectable,
	isController,
	isAllProviderResolved,
	setModuleWaterMark,
	getParamTypes,
	isUndefined,
	isCustomProvider,
} from "./index";

import type {
	ConstructorData,
	ProviderData,
	ControllerData,
	ExportData,
	NactModuleSettings,
	NactCustomProviderSettings,
	NactCustomProvider,
} from "./index";

const NactLogger = getNactLogger();

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

class NactModule {
	protected readonly __moduleToken: string;
	readonly __moduleSettings: NactModuleSettings | null;
	__isInited: boolean;

	import: any[];
	export: ExportData[];
	providers: ProviderData[];
	controllers: ControllerData[];

	constructor(settings: NactModuleSettings) {
		this.__moduleToken = getUniqueToken(settings.isRoot ? "root-module" : "module");
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
	getModuleToken(): string {
		return this.__moduleToken;
	}

	setUniqueToken(object: any, prefix?: string) {
		if (!this.isRegistered(object)) {
			const token = getUniqueToken(prefix);
			Reflect.defineMetadata(INJECTABLE_UNIQUE_TOKEN, token, object);
			return token;
		} else {
			// TODO: THROW ERROR if
		}
	}

	isRegistered(object: any) {
		return Reflect.getMetadata(INJECTABLE_UNIQUE_TOKEN, object) ? true : false;
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
							(provider) =>
								provider.name === constructorParam.name ||
								(isCustomProvider(provider) && provider.providerName === constructorParam.name)
						);
						if (ProviderDepency) {
							if (isCustomProvider(ProviderDepency)) {
								constructorParams.push(this.resolveCustomProvider(ProviderDepency).instance);
							} else {
								constructorParams.push(this.registerProvider(ProviderDepency)?.instance);
							}
						}
						//
						else {
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
		provider.constructorParams = getConstructorParametersData(instance);
		if (provider.constructorParams.params.length > 0) {
			constructorParams = this.getProviderParams(provider);
		}
		provider.instance = new instance(...constructorParams);
	}

	isUsingUnresolvedImports(provider: any): boolean {
		let res = false;

		const providerNames: string[] = [];
		const paramsNames: string[] = [];

		getConstructorParametersData(provider, true).params.forEach((type) => {
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
					this.resolveProviderInstance(providerToUpdate, providerInitialClass);
					return providerToUpdate;
				}
			}
		}
		return null;
	}

	resolveCustomProvider(customProvider: NactCustomProvider): ProviderData {
		let providerValue: any = undefined;
		const providerData: ProviderData = {} as ProviderData;

		if (customProvider.willBeResolvedBy === "useFactory" && customProvider.useFactory) {
			providerValue = customProvider.useFactory();

			this.resolveProviderInstance(providerData, providerValue);
		} else if (customProvider.willBeResolvedBy === "useClass") {
			const classInstance = customProvider.useClass;
			if (!isInitializedClass(classInstance)) {
				this.resolveProviderInstance(providerData, customProvider.useClass);
			} else providerData.instance = classInstance;
		} else {
			providerValue = customProvider.useValue ?? undefined;
			providerData.constructorParams = { params: [], count: 0 };
			providerData.instance = providerValue;
		}

		providerData.name = customProvider.providerName;
		providerData.uniqueToken = this.setUniqueToken(customProvider, "provider") as string;

		this.providers.push(providerData);

		getTransferModule().__providersLocator.push({
			name: customProvider.providerName,
			moduleKey: this.getModuleToken(),
			key: providerData.uniqueToken,
			resolved: true,
			instance: providerData.instance,
		});

		return providerData;
	}

	registerProvider = (provider: any | NactCustomProvider) => {
		if (isInjectable(provider) && isClassInstance(provider)) {
			if (!this.getProvider(provider.name)) {
				const isInitialized = isInitializedClass(provider);
				const canNotBeResolved = isInitialized ? false : this.isUsingUnresolvedImports(provider);

				const providerData: ProviderData = {} as ProviderData;

				providerData.name = provider.name;
				providerData.uniqueToken = this.setUniqueToken(provider, "provider") as string;

				if (!isInitialized && !canNotBeResolved) {
					this.resolveProviderInstance(providerData, provider);
				} else if (isInitialized) {
					providerData.constructorParams = getConstructorParametersData(provider);
					providerData.instance = provider;
				}

				this.providers.push(providerData);

				getTransferModule().__providersLocator.push({
					name: provider.name,
					moduleKey: this.getModuleToken(),
					key: providerData.uniqueToken,
					resolved: !canNotBeResolved,
					instance: !canNotBeResolved ? providerData.instance : null,
				});

				return providerData;
			}
		} else if (isCustomProvider(provider)) {
			if (!this.isRegistered(provider)) {
				this.resolveCustomProvider(provider);
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

		function resolveControllerInstance(controller: ControllerData, instance: any) {
			let constructorParams = [];
			controller.constructorParams = getConstructorParametersData(instance);
			if (controller.constructorParams.params.length > 0) {
				constructorParams = getControllerParams(controller);
			}
			controller.instance = new instance(...constructorParams);
		}

		if (isController(controller)) {
			if (!isInjectable(controller)) {
				const controllerData: ProviderData = {} as ProviderData;
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
			const moduleExport = exports[i];
			const exportInstanceName = typeof moduleExport === "string" ? moduleExport : moduleExport.name;
			if (exportInstanceName) {
				const exportedProvider: ProviderData | undefined = this.__moduleSettings?.providers?.find(
					(provider) => provider.name === exportInstanceName || provider?.providerName === exportInstanceName
				);
				if (exportedProvider) {
					const providerExportData: ExportData = { name: exportInstanceName, key: exportedProvider.uniqueToken };
					this.export.push(providerExportData);
				}
			}
		}
	}
}

function getUniqueToken(prefix?: string): string {
	return (prefix ? `${prefix}-` : "") + Math.random().toString(36).slice(5) + "-" + Math.random().toString(36).slice(5);
}

function createModule(settings: NactModuleSettings) {
	settings.isRoot = false;
	const newModule = new NactModule(settings);
	getTransferModule()._append(newModule);
	return newModule;
}

function createProvider(settings: NactCustomProviderSettings): NactCustomProvider {
	if (isUndefined(settings.providerName)) {
		NactLogger.error("Custom provider name should not be undefined or be empty");
	}
	if (settings?.useFactory === undefined && settings?.useValue === undefined && !settings?.useClass) {
		NactLogger.error(
			`Custom provider with name ${settings.providerName} should have useFactory or useValue or useClass property provided, but none of them not provided`
		);
	}
	if (settings?.useFactory && typeof settings.useFactory !== "function") {
		NactLogger.error(
			`Custom providers useFactory property can only accept values with type of "function", but detected type "${typeof settings.useFactory}" in ${
				settings.useFactory
			}`
		);
	}

	if (settings?.useClass && !isClassInstance(settings?.useClass)) {
		NactLogger.error(
			`Custom providers useClass property can only classes, but detected type "${typeof settings.useFactory}" in ${
				settings.useFactory
			}`
		);
	}

	return {
		...settings,
		uniqueToken: getUniqueToken("module-custom-provider"),
		willBeResolvedBy: settings?.useFactory ? "useFactory" : settings?.useClass ? "useClass" : "useValue",
	};
}

export { createProvider, createModule, NactModule };
