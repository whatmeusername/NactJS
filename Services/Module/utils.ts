import { NactModule } from "./Module";
import { INJECTABLE_WATERMARK, MODULE__WATERMARK } from "../module.consts";
import { CONTROLLER__WATERMARK } from "../../router.const";

function isClassInstance(object: any): boolean {
	return object.prototype?.constructor?.toString().substring(0, 5) === "class";
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
	isClassInstance,
	isInjectable,
	isController,
	moduleHasImport,
	isAllProviderResolved,
	setModuleWaterMark,
	getParamTypes,
};
