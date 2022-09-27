import { INJECTABLE_UNIQUE_TOKEN } from "../nact-constants/index";
import { getNactLogger } from "../nact-logger/index";

import {
	getTransferModule,
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

import { isInitializedClass, isClassInstance } from "../shared/index";

const NactLogger = getNactLogger();

function isInjectArgumentsHasEnoughForFactory(provider: NactCustomProvider): boolean {
	const argsLength = provider?.useFactory?.length ?? -1;
	if (argsLength > 0) {
		return (provider?.injectArguments?.length ?? 0) >= argsLength;
	}
	return true;
}

function getNameFromUseAlias(provider: NactCustomProvider): string | undefined {
	if (provider.willUse === "useAlias" && provider.useAlias) {
		const aliasValue = provider.useAlias;
		return typeof aliasValue === "string" ? aliasValue : isClassInstance(aliasValue) ? aliasValue.name : null;
	}
}

function setReadyForData(data: ProviderData, ready: boolean): ProviderData;
function setReadyForData(data: ControllerData, ready: boolean): ControllerData;
function setReadyForData(data: ProviderData | ControllerData, ready: boolean): ProviderData | ControllerData {
	if (ready && !data.isReady) {
		data.isReady = true;
		if (isInitializedClass(data.instance)) {
			const onProviderReadyDescriptor: () => void | undefined = data?.instance["onInstanceReady"];
			if (onProviderReadyDescriptor && typeof onProviderReadyDescriptor === "function") {
				data.instance.onInstanceReady();
			}
		}
	}
	return data;
}

class NactModule {
	protected readonly __moduleToken: string;
	readonly transferModuleKey: string;
	readonly __moduleSettings: NactModuleSettings | null;
	__isInited: boolean;

	protected import: any[];
	protected export: ExportData[];
	protected providers: ProviderData[];
	protected controllers: ControllerData[];

	constructor(settings: NactModuleSettings, transferModuleKey?: string) {
		this.transferModuleKey = transferModuleKey ?? "0";
		this.__moduleToken = getUniqueToken(settings.isRoot ? ROOT_MODULE_TOKEN : MODULE_TOKEN);
		this.__moduleSettings = settings;
		this.__isInited = false;

		this.providers = [];
		this.controllers = [];
		this.import = [];
		this.export = [];
	}

	// ==== Getters ====
	getExports(): ExportData[] {
		return this.export;
	}

	getImports(): any[] {
		return this.import;
	}

	getProviders(): ProviderData[] {
		return this.providers;
	}

	getControllers(): ControllerData[] {
		return this.controllers;
	}
	// ===== Initialization ====
	initialize(settings?: NactModuleSettings) {
		if (!this.__isInited) {
			if (!settings) settings = this.__moduleSettings as NactModuleSettings;

			if (settings && this.__isInited === false) {
				this.__mapProviders(settings?.providers ?? []);
			}
		}
	}

	finishInitialization(): void {
		if (isAllProviderResolved(this) && !this.__isInited) {
			this.__mapControllers(this.__moduleSettings?.controllers ?? []);
			setModuleWaterMark(this);

			//@ts-ignore// Module Settings should exist till module will be impleted
			this.__moduleSettings = null;
			this.__isInited = true;
		}
	}

	// ---- Tokens ----
	getModuleToken(): string {
		return this.__moduleToken;
	}

	setUniqueToken(object: any, prefix?: string) {
		const token = getUniqueToken(prefix);
		Reflect.defineMetadata(INJECTABLE_UNIQUE_TOKEN, token, object);
		return token;
	}

	// ===== Providers Getters ====

	getProvider(
		providerNameOrToken: string | { new (...args: any[]): any } | (new (...args: any[]) => any),
	): ProviderData | undefined {
		//prettier-ignore
		providerNameOrToken = (typeof providerNameOrToken === "string" ? providerNameOrToken: isClassInstance(providerNameOrToken) ? providerNameOrToken.name : "") as string;
		const isToken =
			providerNameOrToken?.startsWith(PROVIDER_TOKEN) || providerNameOrToken?.startsWith(CUSTOM_PROVIDER_TOKEN);

		if (isToken) {
			return this.providers.find((provider) => provider.uniqueToken === providerNameOrToken);
		}
		return this.providers.find((provider) => provider.name === providerNameOrToken);
	}

	getProviderFromSettings(providerName: string): any | undefined {
		const providersFromSettings = this.__moduleSettings?.providers;
		if (providersFromSettings) {
			return providersFromSettings.find(
				(provider) =>
					provider.name === providerName || (isCustomProvider(provider) && provider.providerName === providerName),
			);
		}
	}

	protected __getProviderParams(provider: ProviderData | NactCustomProvider): Array<any> | null {
		const constructorParams: any[] = [];

		const isCustom = isCustomProvider(provider);
		const params = isCustom
			? mapCustomProviderArgs((provider as NactCustomProvider)?.injectArguments ?? [])
			: (provider as ProviderData).constructorParams.params;

		const paramsCount = isCustom ? params.length : (provider as ProviderData).constructorParams.count;
		const providerName = isCustom ? (provider as NactCustomProvider).providerName : (provider as ProviderData).name;

		if (paramsCount > 0) {
			for (let i = 0; i < paramsCount; i++) {
				const constructorParam = params.find((param) => param.index === i);
				if (constructorParam) {
					const registeredProvider = this.getProvider(constructorParam.name);
					if (registeredProvider?.isReady) {
						constructorParams.push(registeredProvider.instance);
					} else if (registeredProvider && !registeredProvider.isReady) {
						return null;
					}
					//
					else {
						const ProviderDepency = this.getProviderFromSettings(constructorParam.name);
						if (ProviderDepency) {
							let provider: ProviderData | undefined;
							if (isCustomProvider(ProviderDepency)) {
								provider = this.__resolveCustomProvider(ProviderDepency);
							} else {
								provider = this.__registerProvider(ProviderDepency);
							}
							if (provider && provider.isReady) {
								constructorParams.push(provider.instance);
							} else return null;
						}
						//
						else {
							const ImportedDepency = this.import?.find((provider) => provider.name === constructorParam.name);
							if (ImportedDepency) {
								if (!ImportedDepency?.resolved) return null;
								constructorParams.push(ImportedDepency.instance);
							} else if (ImportedDepency === undefined) {
								if (constructorParam.optional) {
									constructorParams.push(undefined);
								} else {
									NactLogger.error(
										`Nact is missing depending provider "${constructorParam.name} (index: ${constructorParam.index})" for provider "${providerName}". Its must be passed as provider or must imported from other module.`,
									);
								}
							}
						}
					}
				} else constructorParams.push(undefined);
			}
		}
		return constructorParams;
	}

	// ---- Resolving / Updating ----

	__updateProvider(providerToken: string): ProviderData | null {
		const providerToUpdate = this.getProvider(providerToken);
		if (providerToUpdate) {
			const initialProvider = this.getProviderFromSettings(providerToUpdate.name);
			if (initialProvider) {
				if (isCustomProvider(initialProvider)) {
					if (initialProvider.willUse === "useFactory" && !this.__isUsingUnresolvedImports(initialProvider)) {
						const injectArguments = this.__getProviderParams(initialProvider);
						if (injectArguments) {
							const providerValue = initialProvider.useFactory(...injectArguments);
							providerToUpdate.instance = providerValue;
							setReadyForData(providerToUpdate, true);
						}
						return providerToUpdate;
					} else if (initialProvider.willUse === "useAlias") {
						const referenceName = getNameFromUseAlias(initialProvider) as string;
						const referenceProvider = this.getProvider(referenceName);
						if (referenceProvider && referenceProvider?.instance) {
							providerToUpdate.instance = referenceProvider?.instance;
							setReadyForData(providerToUpdate, true);
							return providerToUpdate;
						}
					}
				} else if (!this.__isUsingUnresolvedImports(initialProvider)) {
					this.__resolveProviderInstance(providerToUpdate, initialProvider);
					return providerToUpdate;
				}
			}
		}
		return null;
	}

	protected __resolveCustomProvider(customProvider: NactCustomProvider): ProviderData {
		let providerValue: any = undefined;
		let isResolved = true;
		const providerData: ProviderData = {} as ProviderData;
		const willUse = customProvider.willUse;

		function hasPropeperty(property: string): boolean {
			const properties = Object.getOwnPropertyNames(customProvider);
			return properties.includes(property);
		}

		if (willUse === "useFactory" && customProvider.useFactory) {
			if (!isInjectArgumentsHasEnoughForFactory(customProvider)) {
				const useFactoryArgsLength = customProvider?.useFactory?.length ?? 0;
				const injArgsLen = customProvider?.injectArguments?.length ?? 0;
				NactLogger.error(
					`method useFactory of custom provider "${
						customProvider.providerName
					}" expected to get atleast ${useFactoryArgsLength} arguments, ${
						injArgsLen > 0 ? `but got ${injArgsLen}` : "but no one was passed."
					}`,
				);
			}
			if (!this.__isUsingUnresolvedImports(customProvider)) {
				const injectArguments = this.__getProviderParams(customProvider);
				if (injectArguments) {
					providerData.instance = customProvider.useFactory(...injectArguments);
				}
			} else {
				isResolved = false;
			}
		} else if (willUse === "useAlias" && hasPropeperty("useAlias")) {
			const referenceName = getNameFromUseAlias(customProvider);
			if (referenceName) {
				const moduleHasProviderWithName = this.hasProvider(referenceName, true);
				if (moduleHasProviderWithName) {
					let referenceProvider = this.getProvider(referenceName);
					providerData.reference = referenceName;
					if (!referenceProvider) {
						referenceProvider = this.__registerProvider(this.getProviderFromSettings(referenceName));
					}
					if (!referenceProvider?.isReady) isResolved = false;
					if (referenceProvider?.isReady) {
						providerData.instance = referenceProvider.instance;
					}
				} else {
					NactLogger.error(
						`method of custom provider "useAlias" tried to find provider "${referenceName}" from module, but isnt exists or provider imported from other parent
	Solutions:
	- useAlias is not using provider instance from module import.
	- provider that will be used for alias exists in module is not exists.
					`,
					);
				}
			}
		} else if (willUse === "useClass" && hasPropeperty("useClass")) {
			const classInstance = customProvider.useClass;
			if (!isInitializedClass(classInstance)) {
				this.__resolveProviderInstance(providerData, customProvider.useClass);
			} else providerData.instance = classInstance;
		} else {
			providerValue = hasPropeperty("useValue") ? customProvider.useValue : undefined;
			providerData.instance = providerValue;
		}

		setReadyForData(providerData, isResolved);
		providerData.name = customProvider.providerName;
		providerData.uniqueToken = this.setUniqueToken(customProvider, PROVIDER_TOKEN) as string;

		this.providers.push(providerData);

		getTransferModule(this.transferModuleKey)
			.getProviderLocator()
			.push({
				name: customProvider.providerName,
				moduleKey: this.getModuleToken(),
				key: providerData.uniqueToken,
				resolved: isResolved,
				instance: isResolved ? providerData.instance : null,
			});

		return providerData;
	}

	protected __resolveProviderInstance(provider: ProviderData, instance: any) {
		let constructorParams: any[] | null = [];
		provider.constructorParams = getConstructorParametersData(instance);
		if (provider.constructorParams.params.length > 0) {
			constructorParams = this.__getProviderParams(provider);
		}
		if (constructorParams) {
			provider.instance = new instance(...constructorParams);
			setReadyForData(provider, true);
		}
	}

	protected __registerProvider = (provider: any | NactCustomProvider): ProviderData | undefined => {
		if (isInjectable(provider) && isClassInstance(provider)) {
			if (!this.getProvider(provider.name)) {
				const isInitialized = isInitializedClass(provider);
				let isResolved = isInitialized ? true : this.__isUsingUnresolvedImports(provider) ? false : true;

				const providerData: ProviderData = {} as ProviderData;

				providerData.name = provider.name;
				providerData.uniqueToken = this.setUniqueToken(provider, PROVIDER_TOKEN) as string;

				if (!isInitialized && isResolved) {
					this.__resolveProviderInstance(providerData, provider);
					if (!providerData.instance) isResolved = false;
				} else if (isInitialized) {
					providerData.instance = provider;
				}

				setReadyForData(providerData, isResolved);
				this.providers.push(providerData);

				getTransferModule(this.transferModuleKey)
					.getProviderLocator()
					.push({
						name: provider.name,
						moduleKey: this.getModuleToken(),
						key: providerData.uniqueToken,
						resolved: isResolved,
						instance: isResolved ? providerData.instance : null,
					});

				return providerData;
			}
		} else if (isCustomProvider(provider)) {
			return this.__resolveCustomProvider(provider);
		}
	};

	protected __registerController(controller: any) {
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
							`Cannot resolve provider with name "${constructorParam.name} (index: ${constructorParam.index})" for contorller "${controllerData.name}". Nact not found provider`,
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
			setReadyForData(controller, true);
		}

		if (isController(controller)) {
			if (!isInjectable(controller)) {
				const controllerData: ProviderData = {} as ProviderData;
				controllerData.name = controller.name;
				resolveControllerInstance(controllerData, controller);

				this.controllers.push(controllerData);
			} else {
				NactLogger.error(
					`Controllers not allowed to be injectable as same time, but controller "${controller.name}" has injectable flag on.`,
				);
			}
		} else {
			NactLogger.warning(
				`Controller instance must have controller flag on, but got "${controller.name}" without it. (Instance has been passed)`,
			);
		}
	}

	// ==== validating ====

	hasProvider(providerName: string, shouldBeResolved?: boolean): boolean {
		return (
			(this.getProvider(providerName) ?? (shouldBeResolved ? this.getProviderFromSettings(providerName) : undefined)) !==
			undefined
		);
	}

	protected __isUsingUnresolvedImports(provider: any): boolean {
		let res = false;

		const providerNames: string[] = [];
		const paramsNames: string[] = [];

		const params = isCustomProvider(provider)
			? mapCustomProviderArgs(provider.injectArguments)
			: getConstructorParametersData(provider, true).params;

		params.forEach((type) => {
			paramsNames.push(type.name);
		});

		this.__moduleSettings?.providers?.forEach((provider) => providerNames.push(provider.name));

		for (let i = 0; i < paramsNames.length; i++) {
			const name = paramsNames[i];
			if (!providerNames.includes(name)) {
				res = this.import.find((imp) => imp.name === name && imp.resolved === false) !== undefined;
				if (res) return res;
			}
		}
		return res;
	}

	// ---- Mapping ---

	protected __mapProviders(providers: any[]) {
		for (let i = 0; i < providers.length; i++) {
			const provider = providers[i];
			this.__registerProvider(provider);
		}
	}

	protected __mapControllers(controllers: any[]) {
		for (let i = 0; i < controllers.length; i++) {
			const controller = controllers[i];
			this.__registerController(controller);
		}
	}

	// ===== EXPORT =====
	__loadExports(exports: any[]) {
		for (let i = 0; i < exports.length; i++) {
			const moduleExport = exports[i];
			const exportInstanceName = typeof moduleExport === "string" ? moduleExport : moduleExport.name;
			if (exportInstanceName) {
				const exportedProvider: ProviderData | undefined = this.getProviderFromSettings(exportInstanceName);
				if (exportedProvider) {
					const providerExportData: ExportData = { name: exportInstanceName, key: exportedProvider.uniqueToken };
					this.export.push(providerExportData);
				}
			}
		}
	}
}

function createModule(settings: NactModuleSettings, transferModulesKey?: string) {
	settings.isRoot = false;
	const newModule = new NactModule(settings, transferModulesKey);
	getTransferModule(transferModulesKey).append(newModule);
	return newModule.getModuleToken();
}

function createProvider(settings: NactCustomProviderSettings): NactCustomProvider {
	if (isUndefined(settings.providerName)) {
		NactLogger.error("Custom provider name should not be undefined or be empty");
	}

	function hasPropeperty(property: string): boolean {
		const properties = Object.getOwnPropertyNames(settings);
		return properties.includes(property);
	}

	if (
		!hasPropeperty("useFactory") &&
		!hasPropeperty("useValue") &&
		!hasPropeperty("useClass") &&
		!hasPropeperty("useAlias")
	) {
		NactLogger.error(
			`Custom provider with name ${settings.providerName} should have useFactory or useValue or useClass or useAlias property provided, but none of them not provided`,
		);
	}
	if (hasPropeperty("useFactory") && typeof settings.useFactory !== "function") {
		NactLogger.error(
			`Custom providers useFactory property can only accept values with type of "function", but detected type "${typeof settings.useFactory}" in ${
				settings.useFactory
			}`,
		);
	}

	if (hasPropeperty("useClass") && !isClassInstance(settings?.useClass)) {
		NactLogger.error(
			`Custom providers useClass property can accept only classes, but detected value type of"${typeof settings.useClass}" in ${
				settings.providerName
			}`,
		);
	}

	const isAllowedTypeForAlias = isClassInstance(settings?.useAlias) || typeof settings?.useAlias === "string";
	if (hasPropeperty("useAlias") && !isAllowedTypeForAlias) {
		NactLogger.error(
			`Custom providers useAlias property can only classes or strings, but detected type "${typeof settings.useAlias}" in ${
				settings.providerName
			}`,
		);
	}

	// prettier-ignore
	const willUse = settings?.useFactory ? "useFactory" : (settings?.useClass ? "useClass" : (settings.useAlias ? "useAlias" : "useValue"));

	return {
		...settings,
		uniqueToken: getUniqueToken(CUSTOM_PROVIDER_TOKEN),
		willUse: willUse,
	};
}

export { createProvider, createModule, NactModule };
