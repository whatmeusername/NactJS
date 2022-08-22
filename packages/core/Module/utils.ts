import type { NactModule, NactCustomProvider } from "./index";
import { INJECTABLE_WATERMARK, MODULE__WATERMARK, CONTROLLER__WATERMARK } from "../nact-constants/index";

function isClassInstance(object: any): boolean {
	return (
		object.prototype?.constructor?.toString().substring(0, 5) === "class" ||
		object.constructor?.toString().substring(0, 5) === "class"
	);
}

function isUndefined(value: any): boolean {
	return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function isInitializedClass(object: any): boolean {
	return isClassInstance(object) && typeof object === "object";
}

function isRootModule(module: NactModule): boolean {
	return module?.getModuleToken()?.startsWith("root-module");
}

function isModule(module: NactModule): boolean {
	return module?.getModuleToken()?.startsWith("module");
}

function isCustomProvider(provider: NactCustomProvider): boolean {
	return typeof provider === "object" && provider?.uniqueToken?.startsWith("module-custom-provider");
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
};
