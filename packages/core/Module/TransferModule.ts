import { getNactLogger } from "../nact-logger/index";

import type {
	NactModuleSettings,
	TransferModuleExportsOrImport,
	ProviderLocation,
	ProviderData,
	NactCustomProvider,
	ParameterData,
	ConstructorData,
} from "./index";
import {
	NactModule,
	moduleHasImport,
	isModule,
	isRootModule,
	isCustomProvider,
	isClassInstance,
	mapCustomProviderArgs,
	getConstructorParametersData,
	unpackModuleArrays,
	resolveRootCustomProviderFactory,
	PROVIDER_TOKEN,
	CUSTOM_PROVIDER_TOKEN,
	MODULE_TOKEN,
	ROOT_MODULE_TOKEN,
} from "./index";

// const logger = getNactLogger();
let NactTransferModuleInstance: NactTransferModule;

function getTransferModule(): NactTransferModule {
	if (!NactTransferModuleInstance) {
		NactTransferModuleInstance = new NactTransferModule();
	}
	return NactTransferModuleInstance;
}

interface NactRootModuleSettings extends Omit<NactModuleSettings, "import"> {
	controllers?: any[];
	providers?: any[];
	exports?: any[];
}

function createRootModule(settings: NactRootModuleSettings): NactModule {
	settings.isRoot = true;
	const newModule = new NactModule(settings);
	return newModule;
}

function createNewTransferModule(): NactTransferModule {
	NactTransferModuleInstance = new NactTransferModule();
	return NactTransferModuleInstance;
}

class NactTransferModule {
	protected readonly __modules: NactModule[];
	protected readonly __exports: TransferModuleExportsOrImport[];
	protected readonly __rootModules: NactModule[];
	protected __phase: "preparing" | "resolving" | "ready";
	protected __asyncQueryCount: number;
	__providersLocator: ProviderLocation[];

	constructor(modules?: NactModule[]) {
		this.__providersLocator = [];
		this.__modules = [];
		this.__exports = [];
		this.__asyncQueryCount = 0;
		this.__phase = "preparing";
		if (modules) this._append(modules);
	}

	get length() {
		return this.__modules.length;
	}

	// ----- Public General ----

	useAsRootModule(settings: NactRootModuleSettings) {
		const exportAllProviders = (settings: NactRootModuleSettings): NactRootModuleSettings => {
			const providers = settings.providers ?? [];
			settings.export = [];

			for (let i = 0; i < providers.length; i++) {
				const provider = providers[i];
				if (isCustomProvider(provider)) {
					settings?.export?.push(provider.providerName);
				} else if (isClassInstance(provider)) {
					settings?.export?.push(provider.name);
				}
			}

			return settings;
		};
		const create = (settings: NactRootModuleSettings) => {
			exportAllProviders(settings);
			const module = createRootModule(settings);
			this.__modules.unshift(module);
			module.loadExports(module.__moduleSettings?.export ?? []);
			this._getExports(module);
		};

		if (settings instanceof Promise) {
			this.__asyncQueryCount += 1;
			settings.then((response) => {
				create(response);
				this.__asyncQueryCount -= 1;
			});
		} else create(settings);
	}

	hasModule(moduleKey: string): boolean {
		return this.__modules.find((module) => module.getModuleToken() === moduleKey) !== undefined;
	}
	// ---- Service ----

	getProviderLocationByName(ProviderName: string | { new (): void }): any {
		ProviderName = isClassInstance(ProviderName) ? (ProviderName as { new (): void }).name : ProviderName;
		let provider = this.__providersLocator.find((provider) => provider.name === ProviderName);
		if (!provider) {
			for (let i = 0; i < this.__modules.length; i++) {
				const module = this.__modules[i];
				if (!module.__isInited) {
					provider = module.__moduleSettings?.providers?.find(
						(provider) => provider.name === ProviderName || provider.providerName === ProviderName
					);
					if (provider) break;
				}
			}
		}
		return provider;
	}

	getModulesControllers(instanceOnly = false): any[] {
		const modules = this.__modules;
		const controllers = [];
		for (let i = 0; i < modules.length; i++) {
			let moduleControllers = modules[i].controllers;

			if (instanceOnly) {
				moduleControllers = moduleControllers.map((controller) => controller.instance);
			}
			controllers.push(...moduleControllers);
		}
		return controllers;
	}

	__beginResolvingPhase(): void {
		const modulesProvides = this.__providersLocator;

		const countUnresolvedProviders = (): number =>
			this.__providersLocator.filter((provider) => provider.resolved === false).length;

		let unresProvidersPreviousInter = countUnresolvedProviders();

		while (unresProvidersPreviousInter !== 0) {
			for (let i = 0; i < modulesProvides.length; i++) {
				const provider = modulesProvides[i];
				if (!provider.resolved) {
					const providerModule = this.__modules.find((module) => module.getModuleToken() === provider.moduleKey);
					if (providerModule) {
						this.resolveModuleImports(providerModule);
						const response = providerModule.updateProvider(provider.key);
						if (response) {
							provider.resolved = true;
							provider.instance = response.instance;
						}
					}
				}
			}
			const unresProvidersCurrentInter = countUnresolvedProviders();
			if (unresProvidersPreviousInter === unresProvidersCurrentInter) {
				console.log("resolve error");
				break;
			} else unresProvidersPreviousInter = unresProvidersCurrentInter;
		}
	}

	__closingResolvingPhase(): void {
		for (let i = 0; i < this.__modules.length; i++) {
			const module = this.__modules[i];
			if (module) {
				module.__endInit();
			}
		}
		this.__phase = "ready";
	}

	protected __InitModuleSync(module: NactModule): void {
		if (!module.__isInited) {
			this.resolveModuleImports(module);
			module._startInit();
		}
	}

	protected async __InitModuleAsync(module: NactModule): Promise<void> {
		if (!module.__isInited) {
			this.resolveModuleImports(module);
			module._startInit();
		}
	}

	_initPhase(): void {
		const begin = () => {
			this.__phase = "resolving";
			for (let i = 0; i < this.__modules.length; i++) {
				const module = this.__modules[i];

				const providers = module?.__moduleSettings?.providers ?? [];

				this.isModuleUsingRootExports(module);
				this.__InitModuleSync(module);
			}
			this.__beginResolvingPhase();
			this.__closingResolvingPhase();
		};

		this.__modules.forEach((module: NactModule) => {
			if (isRootModule(module)) {
				const providers = module?.__moduleSettings?.providers ?? [];
				providers.forEach((provider) => {
					if (isCustomProvider(provider)) {
						const res = resolveRootCustomProviderFactory(provider);
						if (res instanceof Promise) {
							this.__asyncQueryCount += 1;
							res.then((_) => (this.__asyncQueryCount -= 1));
						}
					}
				});
			}
		});

		let asyncTimeLimit = 1000;
		const timeout = 75;
		const waitForAllAsyncAndBegin = () => {
			if (this.__asyncQueryCount !== 0 && asyncTimeLimit > 0) {
				setTimeout(() => {
					asyncTimeLimit -= timeout;
					waitForAllAsyncAndBegin();
				}, timeout);
			} else if (this.__asyncQueryCount === 0) {
				begin();
			} else if (asyncTimeLimit === 0) {
				begin();
			}
		};
		waitForAllAsyncAndBegin();
	}

	_append(module: NactModule | NactModule[]): void {
		const append = (module: NactModule) => {
			if (isModule(module)) {
				unpackModuleArrays(module);
				this.__modules.push(module);
				module.loadExports(module.__moduleSettings?.export ?? []);
				this._getExports(module);
			}
		};

		if (Array.isArray(module)) {
			for (let i = 0; i < module.length; i++) {
				append(module[i]);
			}
		} else append(module);
	}

	_getExports(module: NactModule) {
		if (module.export.length > 0) {
			for (let i = 0; i < module.export.length; i++) {
				const exportedProviderData = module.export[i];
				if (exportedProviderData) {
					this.__exports.push({
						moduleKey: module.getModuleToken(),
						providerName: exportedProviderData.name,
					});
				}
			}
		}
	}

	// ----- Imports ------

	canBeImported(providerName: string): boolean {
		const exports = this.__exports;
		if (exports.find((ex) => ex.providerName === providerName)) return true;
		return false;
	}

	resolveModuleImports(module: NactModule, imports?: any[]): void {
		const moduleImports = imports ?? module.__moduleSettings?.import ?? [];
		if (moduleImports.length > 0) {
			for (let i = 0; i < moduleImports.length; i++) {
				const moduleImport = moduleImports[i];
				const currentImportName = typeof moduleImport === "string" ? moduleImport : moduleImports[i].name;

				if (this.canBeImported(currentImportName)) {
					if (!moduleHasImport(module, currentImportName)) {
						const importedProvider = this.__providersLocator.find((provider) => provider.name === currentImportName);

						if (importedProvider) {
							module.import.push(importedProvider);
						} else {
							const unresolvedProvider = this.getProviderLocationByName(currentImportName);
							if (unresolvedProvider) {
								const providerName = unresolvedProvider.name ?? unresolvedProvider.providerName;

								module.import.push({
									name: providerName,
									moduleKey: unresolvedProvider.moduleKey,
									resolved: false,
									instance: null,
									key: null,
								});
							}
						}
					} else {
						const importedProvider = this.__providersLocator.find((p) => p.name === currentImportName);
						const importPosition = module.import.findIndex(
							(imp) => imp.name === currentImportName && imp.resolved === false
						);
						if (importPosition !== -1) module.import[importPosition] = importedProvider;
					}
				}
			}
		}
	}

	// ---- Validating -----
	isModuleUsingRootExports(module: NactModule): { r: boolean; p: string[] } {
		const result = { r: false, p: [] };
		const moduleSettings = module.__moduleSettings;

		const initialProviders = moduleSettings?.providers ?? [];
		const initialControllers = moduleSettings?.controllers ?? [];

		const rootExports = this.__exports.filter((exp) => exp.moduleKey.startsWith(ROOT_MODULE_TOKEN) === true);

		const moduleNotImportedModules: string[] = [];
		const moduleImports = moduleSettings?.import?.map((imp) => (typeof imp === "string" ? imp : imp?.name));
		let providersParameters: ParameterData[] = [];

		const resolveGlobalImports = (): void => {
			for (let i = 0; i < providersParameters.length; i++) {
				const param = providersParameters[i];
				if (!moduleNotImportedModules.includes(param.name) && !moduleImports?.includes(param.name)) {
					const importIndex = rootExports.findIndex((exp) => exp.providerName === param.name);
					if (importIndex !== -1) {
						moduleSettings?.import?.push(rootExports[importIndex].providerName);
					}
				}
			}
		};

		for (let i = 0; i < initialProviders.length; i++) {
			if (isCustomProvider(initialProviders[i])) {
				const customProvider: NactCustomProvider = initialProviders[i];
				moduleNotImportedModules.push(customProvider.providerName);
				if (customProvider?.injectParameters) {
					const injectParameters = mapCustomProviderArgs(customProvider.injectParameters);
					providersParameters = [...providersParameters, ...injectParameters];
				}
			} else if (isClassInstance(initialProviders[i])) {
				const provider: ProviderData = initialProviders[i];
				moduleNotImportedModules.push(provider.name);
				const providerParameters: ConstructorData = getConstructorParametersData(provider, true);
				providersParameters = [...providersParameters, ...providerParameters.params];
			}
		}

		for (let i = 0; i < initialControllers.length; i++) {
			const controller = initialControllers[i];
			const controllerParameters: ConstructorData = getConstructorParametersData(controller, true);
			providersParameters = [...providersParameters, ...controllerParameters.params];
		}

		resolveGlobalImports();

		return result;
	}
}

export type { NactRootModuleSettings };
export { NactTransferModule, createRootModule, getTransferModule, createNewTransferModule };
