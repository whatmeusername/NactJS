import { getNactLogger } from "../nact-logger/index";
import CoreModule from "./CoreModule";

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
	mapCustomProviderArgs,
	getConstructorParametersData,
	unpackModuleArrays,
	resolveRootCustomProviderFactory,
	ROOT_MODULE_TOKEN,
} from "./index";

import { isClassInstance } from "../shared/index";

// const logger = getNactLogger();
const NactLogger = getNactLogger();

const transferModulesStorage: Map<string, NactTransferModule> = new Map<string, NactTransferModule>();

function createNewTransferModule(key?: string): NactTransferModule {
	const tmKey = key ?? "0";
	const newInstance = new NactTransferModule(tmKey);
	transferModulesStorage.set(tmKey, newInstance);
	newInstance.append(new CoreModule(tmKey));
	return newInstance;
}

function getTransferModule(key?: string): NactTransferModule {
	const tmKey = key ?? "0";
	let NactTransferModuleInstance = transferModulesStorage.get(tmKey);
	if (!NactTransferModuleInstance) {
		NactTransferModuleInstance = createNewTransferModule(tmKey);
	}
	return NactTransferModuleInstance;
}

interface NactRootModuleSettings extends Omit<NactModuleSettings, "import"> {
	controllers?: any[];
	providers?: any[];
	exports?: any[];
}

function createRootModule(settings: NactRootModuleSettings, key: string): NactModule {
	settings.isRoot = true;
	const newModule = new NactModule(settings, key);
	return newModule;
}

class NactTransferModule {
	protected readonly __modules: NactModule[];
	protected readonly __exports: TransferModuleExportsOrImport[];
	protected readonly __rootModules: NactModule[];
	protected __phase: "preparing" | "resolving" | "ready";
	protected __asyncQueryCount: number;
	readonly key: string;
	protected __providersLocator: ProviderLocation[];

	constructor(key: string) {
		this.__providersLocator = [];
		this.__modules = [];
		this.__exports = [];
		this.__asyncQueryCount = 0;
		this.__phase = "preparing";
		this.key = key ?? "0";
	}

	// ===== Getters ====
	get length() {
		return this.__modules.length;
	}

	getProviderLocator(): ProviderLocation[] {
		return this.__providersLocator;
	}

	getCoreModule(): CoreModule | undefined {
		return this.__modules.find((module) => module instanceof CoreModule) as CoreModule;
	}
	// ----- Public General ----

	append(module: NactModule | NactModule[]): void {
		const append = (module: NactModule) => {
			if (isModule(module)) {
				unpackModuleArrays(module);
				this.__modules.push(module);
				module.__loadExports(module.__moduleSettings?.export ?? []);
				this.__getExports(module);
			} else if (isRootModule(module)) {
				NactLogger.error(
					"Tried append root module as standard module. To append root modules use 'useRootModule' instead.",
				);
			}
		};

		if (Array.isArray(module)) {
			for (let i = 0; i < module.length; i++) {
				append(module[i]);
			}
		} else append(module);
	}

	useRootModule(settings: NactRootModuleSettings): void {
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
			const module = createRootModule(settings, this.key);
			this.__modules.unshift(module);
			module.__loadExports(module.__moduleSettings?.export ?? []);
			this.__getExports(module);
		};

		if (settings instanceof Promise) {
			this.__asyncQueryCount += 1;
			settings.then((response) => {
				create(response);
				this.__asyncQueryCount -= 1;
			});
		} else create(settings);
	}

	useModule(settings: NactModuleSettings): string {
		settings.isRoot = false;
		const newModule = new NactModule(settings, this.key);
		this.append(newModule);
		return newModule.getModuleToken();
	}

	hasModule(moduleKey: string): boolean {
		return this.__modules.find((module) => module.getModuleToken() === moduleKey) !== undefined;
	}

	async initialize(): Promise<void> {
		const BeginInitalization = () => {
			this.__phase = "resolving";
			for (let i = 0; i < this.__modules.length; i++) {
				const module = this.__modules[i];

				this.__isModuleUsingRootImports(module);
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
							res.then(() => (this.__asyncQueryCount -= 1));
						}
					}
				});
			}
		});

		let asyncTimeLimit = 1000;
		const timeout = 75;

		const waitForAllAsyncAndBegin = async () => {
			return new Promise((resolve, reject) => {
				if (this.__asyncQueryCount !== 0 && asyncTimeLimit > 0) {
					setTimeout(async () => {
						asyncTimeLimit -= timeout;
						resolve(waitForAllAsyncAndBegin());
					}, timeout);
				} else if (this.__asyncQueryCount === 0) {
					resolve(BeginInitalization());
				} else if (asyncTimeLimit === 0) {
					resolve(BeginInitalization());
				} else {
					reject();
				}
			});
		};

		await waitForAllAsyncAndBegin();
	}
	// ---- Providers ----

	protected __getProviderFromLocation(ProviderName: string): any {
		return this.__providersLocator.find((provider) => provider.name === ProviderName);
	}

	// ===== Phases ====
	protected __beginResolvingPhase(): void {
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
						this.__resolveModuleImports(providerModule);
						const response = providerModule.__updateProvider(provider.key);
						if (response && response.isReady) {
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

	protected __closingResolvingPhase(): void {
		for (let i = 0; i < this.__modules.length; i++) {
			const module = this.__modules[i];
			if (module) {
				module.finishInitialization();
			}
		}
		this.__phase = "ready";
	}

	// ---- Initing ----
	protected __InitModuleSync(module: NactModule): void {
		if (!module.__isInited) {
			this.__resolveModuleImports(module);
			module.initialize();
		}
	}

	protected async __InitModuleAsync(module: NactModule): Promise<void> {
		if (!module.__isInited) {
			this.__resolveModuleImports(module);
			module.initialize();
		}
	}

	// ==== Module Getters =====

	getProviderFromLocationByName(ProviderName: string | { new (): void }): any {
		ProviderName = (isClassInstance(ProviderName) ? (ProviderName as { new (): void }).name : ProviderName) as string;
		let provider = this.__getProviderFromLocation(ProviderName);
		if (!provider) {
			for (let i = 0; i < this.__modules.length; i++) {
				const module = this.__modules[i];
				if (!module.__isInited) {
					provider = module.getProviderFromSettings(ProviderName);
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
			let moduleControllers = modules[i].getControllers();

			if (instanceOnly) {
				moduleControllers = moduleControllers.map((controller) => controller.instance);
			}
			controllers.push(...moduleControllers);
		}
		return controllers;
	}

	protected __getExports(module: NactModule) {
		const moduleExport = module.getExports();
		if (moduleExport.length > 0) {
			for (let i = 0; i < moduleExport.length; i++) {
				const exportedProviderData = moduleExport[i];
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

	protected __providerCanBeImported(providerName: string): boolean {
		const exports = this.__exports;
		if (exports.find((ex) => ex.providerName === providerName)) return true;
		return false;
	}

	protected __resolveModuleImports(module: NactModule, imports?: any[]): void {
		const moduleSettingsImports = imports ?? module.__moduleSettings?.import ?? [];
		if (moduleSettingsImports.length > 0) {
			for (let i = 0; i < moduleSettingsImports.length; i++) {
				const moduleImport = moduleSettingsImports[i];
				const currentImportName = typeof moduleImport === "string" ? moduleImport : moduleSettingsImports[i].name;

				if (this.__providerCanBeImported(currentImportName)) {
					const moduleImports = module.getImports();
					if (!moduleHasImport(module, currentImportName)) {
						const importedProvider = this.__getProviderFromLocation(currentImportName);

						if (importedProvider) {
							moduleImports.push(importedProvider);
						} else {
							const unresolvedProvider = this.getProviderFromLocationByName(currentImportName);
							if (unresolvedProvider) {
								const providerName = unresolvedProvider.name ?? unresolvedProvider.providerName;

								moduleImports.push({
									name: providerName,
									moduleKey: unresolvedProvider.moduleKey,
									resolved: false,
									instance: null,
									key: null,
								});
							}
						}
					} else {
						const importedProvider = this.__getProviderFromLocation(currentImportName);
						const importPosition = moduleImports.findIndex((imp) => imp.name === currentImportName && imp.resolved === false);
						if (importPosition !== -1) moduleImports[importPosition] = importedProvider;
					}
				}
			}
		}
	}

	// ===== Validating =====
	protected __isModuleUsingRootImports(module: NactModule): { r: boolean; p: string[] } {
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
				if (customProvider?.injectArguments) {
					const injectArguments = mapCustomProviderArgs(customProvider.injectArguments);
					providersParameters = [...providersParameters, ...injectArguments];
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
