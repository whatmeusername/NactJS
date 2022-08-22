import type { NactModuleSettings, TransferModuleExportsOrImport, ProviderLocation } from "./index";
import { NactModule, moduleHasImport, isModule, isRootModule } from "./index";

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

	useAsRootModule(settings: NactRootModuleSettings) {
		const create = (settings: NactRootModuleSettings) => {
			const module = createRootModule(settings);
			if (isRootModule(module)) {
				this.__modules.push(module);
				this._getExports(module);
			}
		};

		if (settings instanceof Promise) {
			this.__asyncQueryCount += 1;
			settings.then((response) => {
				create(response);
				this.__asyncQueryCount -= 1;
			});
		} else create(settings);
	}

	getProviderLocationByName(name: string): any {
		let provider = this.__providersLocator.find((provider) => provider.name === name);
		let moduleKey = null;
		if (!provider) {
			for (let i = 0; i < this.__modules.length; i++) {
				const module = this.__modules[i];
				if (!module.__isInited) {
					provider = module.__moduleSettings?.providers?.find(
						(provider) => provider.name === name || provider.providerName === name
					);
					if (provider) break;
				}
				moduleKey = module.getModuleToken();
			}
		}
		return { provider: provider, moduleKey: moduleKey };
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
				this.__InitModuleSync(this.__modules[i]);
			}
			this.__beginResolvingPhase();
			this.__closingResolvingPhase();
		};

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
							if (unresolvedProvider.provider) {
								module.import.push({
									name: unresolvedProvider.provider.name ?? unresolvedProvider.provider.providerName,
									moduleKey: unresolvedProvider.moduleKey,
									resolved: false,
									instance: null,
									key: null,
								});
							}
						}
					} else {
						const importedProvider = this.__providersLocator.find((provider) => provider.name === currentImportName);
						const importPosition = module.import.findIndex(
							(imp) => imp.name === currentImportName && imp.resolved === false
						);
						if (importPosition !== -1) module.import[importPosition] = importedProvider;
					}
				}
			}
		}
	}
}

export type { NactRootModuleSettings };
export { createRootModule, getTransferModule };
