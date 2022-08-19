import type { TransferModuleExportsOrImport, ProviderLocation } from "./index";
import { NactModule, moduleHasImport } from "./index";

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
	protected readonly __exports: TransferModuleExportsOrImport[];
	__providersLocator: ProviderLocation[];
	constructor(modules?: NactModule[]) {
		this.__providersLocator = [];
		this.__modules = [];
		this.__exports = [];

		if (modules) this._append(modules);
	}

	getProviderLocationByName(name: string): any {
		let provider = this.__providersLocator.find((provider) => provider.name === name);
		let moduleKey = null;
		if (!provider) {
			for (let i = 0; i < this.__modules.length; i++) {
				const module = this.__modules[i];
				if (!module.__isInited) {
					provider = module.__moduleSettings?.providers?.find((provider) => provider.name === name);
				}
				moduleKey = module.__getModuleToken();
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
					const providerModule = this.__modules.find((module) => module.__getModuleToken() === provider.moduleKey);
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
				// TODO
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
	}

	_initPhase(): void {
		const InitModule = (module: NactModule): void => {
			if (!module.__isInited) {
				this.resolveModuleImports(module);
				module._startInit();
			}
		};

		for (let i = 0; i < this.__modules.length; i++) {
			InitModule(this.__modules[i]);
		}
		this.__beginResolvingPhase();
		this.__closingResolvingPhase();
	}

	_append(module: NactModule | NactModule[]): void {
		const append = (module: NactModule) => {
			if (module?.__getModuleToken()?.startsWith("module")) {
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
						moduleKey: module.__getModuleToken(),
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
				const currentImportName = moduleImports[i].name;
				if (this.canBeImported(currentImportName)) {
					if (!moduleHasImport(module, currentImportName)) {
						const importedProvider = this.__providersLocator.find((provider) => provider.name === currentImportName);
						if (importedProvider) {
							module.import.push(importedProvider);
						} else {
							const unresolvedProvider = this.getProviderLocationByName(currentImportName);
							if (unresolvedProvider.provider) {
								module.import.push({
									name: unresolvedProvider.provider.name,
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

export { createTransferModule, getTransferModule };
