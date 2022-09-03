import { INJECTABLE_UNIQUE_TOKEN } from "../nact-constants/index";
import { getNactLogger } from "../nact-logger/index";

import {
	getTransferModule,
	isClassInstance,
	isInitializedClass,
	isInjectable,
	isController,
	isAllProviderResolved,
	setModuleWaterMark,
	isUndefined,
	isCustomProvider,
	getUniqueToken,
	mapCustomProviderArgs,
	getConstructorParametersData,
	PROVIDER_TOKEN,
	CUSTOM_PROVIDER_TOKEN,
	MODULE_TOKEN,
	ROOT_MODULE_TOKEN,
} from "./index";

import type {
	ProviderData,
	ControllerData,
	ExportData,
	NactModuleSettings,
	NactCustomProviderSettings,
	NactCustomProvider,
} from "./index";

const NactLogger = getNactLogger();

function isProviderToken(token: string): boolean {
	return token.startsWith(PROVIDER_TOKEN);
}
function isInjectArgumentsHasEnoughForFactory(provider: NactCustomProvider): boolean {
	const argsLength = provider?.useFactory?.length ?? -1;
	if (argsLength > 0) {
		return (provider?.injectParameters?.length ?? 0) >= argsLength;
	}
	return true;
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
		this.__moduleToken = getUniqueToken(settings.isRoot ? ROOT_MODULE_TOKEN : MODULE_TOKEN);
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
			this.mapProviders(settings?.providers ?? []);
		}
	}

	__endInit(): void {
		if (isAllProviderResolved(this)) {
			this.mapControllers(this.__moduleSettings?.controllers ?? []);
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
		const token = getUniqueToken(prefix);
		Reflect.defineMetadata(INJECTABLE_UNIQUE_TOKEN, token, object);
		return token;
	}

	isRegistered(object: any) {
		return Reflect.getMetadata(INJECTABLE_UNIQUE_TOKEN, object) ? true : false;
	}

	// =================

	// --- Providers ---

	getProvider(providerNameOrToken: string): ProviderData | undefined {
		const isToken =
			providerNameOrToken?.startsWith(PROVIDER_TOKEN) || providerNameOrToken?.startsWith(CUSTOM_PROVIDER_TOKEN);
		if (isToken) {
			return this.providers.find((provider) => provider.uniqueToken === providerNameOrToken);
		}
		return this.providers.find((provider) => provider.name === providerNameOrToken);
	}

	getProviderParams(provider: ProviderData | NactCustomProvider): Array<any> {
		const constructorParams: any[] = [];

		const isCustom = isCustomProvider(provider);
		const params = isCustom
			? mapCustomProviderArgs((provider as NactCustomProvider)?.injectParameters ?? [])
			: (provider as ProviderData).constructorParams.params;

		const paramsCount = isCustom ? params.length : (provider as ProviderData).constructorParams.count;
		const providerName = isCustom ? (provider as NactCustomProvider).providerName : (provider as ProviderData).name;

		if (paramsCount > 0) {
			for (let i = 0; i < paramsCount; i++) {
				const constructorParam = params.find((param) => param.index === i);
				if (constructorParam) {
					const registeredProvider = this.getProvider(constructorParam.name);
					if (registeredProvider) {
						constructorParams.push(registeredProvider.instance);
					} else {
						const ProviderDepency = this.__moduleSettings?.providers?.find(
							(p) =>
								p.name === constructorParam.name || (isCustomProvider(p) && p.providerName === constructorParam.name)
						);
						if (ProviderDepency) {
							if (isCustomProvider(ProviderDepency)) {
								constructorParams.push(this.resolveCustomProvider(ProviderDepency)?.instance);
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
									`Nact is missing depending provider "${constructorParam.name} (index: ${constructorParam.index})" "for provider "${providerName}". Its must be passed as provider or must imported from other module.`
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

		const params = isCustomProvider(provider)
			? mapCustomProviderArgs(provider.injectParameters)
			: getConstructorParametersData(provider, true).params;

		params.forEach((type) => {
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
		const providerToUpdate = this.getProvider(providerToken);
		if (providerToUpdate) {
			const initialProvider = this.__moduleSettings?.providers?.find(
				(provider) => provider.name === providerToUpdate.name || provider.providerName === providerToUpdate.name
			);
			if (initialProvider) {
				if (isCustomProvider(initialProvider)) {
					if (!this.isUsingUnresolvedImports(initialProvider)) {
						const injectArguments = this.getProviderParams(initialProvider);
						if (initialProvider.useFactory) {
							const providerValue = initialProvider.useFactory(...injectArguments);
							providerToUpdate.instance = providerValue;
							return providerToUpdate;
						}
					}
				} else if (!this.isUsingUnresolvedImports(initialProvider)) {
					this.resolveProviderInstance(providerToUpdate, initialProvider);
					return providerToUpdate;
				}
			}
		}
		return null;
	}

	resolveCustomProvider(customProvider: NactCustomProvider): ProviderData {
		let providerValue: any = undefined;
		let isResolved = true;
		const providerData: ProviderData = {} as ProviderData;

		if (customProvider.willBeResolvedBy === "useFactory" && customProvider.useFactory) {
			if (!isInjectArgumentsHasEnoughForFactory(customProvider)) {
				const useFactoryArgsLength = customProvider?.useFactory?.length ?? 0;
				const injArgsLen = customProvider?.injectParameters?.length ?? 0;
				NactLogger.error(
					`method useFactory of custom provider "${
						customProvider.providerName
					}" expected to get atleats ${useFactoryArgsLength} arguments, ${
						injArgsLen > 0 ? `but got ${injArgsLen}` : "but no one was passed."
					}`
				);
			}
			if (!this.isUsingUnresolvedImports(customProvider)) {
				const injectArguments = this.getProviderParams(customProvider);
				providerData.instance = customProvider.useFactory(...injectArguments);
			} else {
				isResolved = false;
			}
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
		providerData.uniqueToken = this.setUniqueToken(customProvider, PROVIDER_TOKEN) as string;

		this.providers.push(providerData);

		getTransferModule().__providersLocator.push({
			name: customProvider.providerName,
			moduleKey: this.getModuleToken(),
			key: providerData.uniqueToken,
			resolved: isResolved,
			instance: isResolved ? providerData.instance : null,
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
				providerData.uniqueToken = this.setUniqueToken(provider, PROVIDER_TOKEN) as string;

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

	mapProviders(providers: any[]) {
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
					const provider = this.getProvider(constructorParam.name);
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

	mapControllers(controllers: any[]) {
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

function createModule(settings: NactModuleSettings) {
	settings.isRoot = false;
	const newModule = new NactModule(settings);
	getTransferModule()._append(newModule);
	return newModule.getModuleToken();
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
		//NACT_CUSTOM_PROVIDER_TOKEN
		uniqueToken: getUniqueToken(CUSTOM_PROVIDER_TOKEN),
		willBeResolvedBy: settings?.useFactory ? "useFactory" : settings?.useClass ? "useClass" : "useValue",
	};
}

export { createProvider, createModule, NactModule };
