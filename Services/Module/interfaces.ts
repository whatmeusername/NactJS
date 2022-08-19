interface ConstructorParam {
	name: string;
	index: number;
	type: string;
}

interface ConstructorData {
	params: ConstructorParam[];
	count: number;
}

interface ProviderData {
	instance: any;
	name: string;
	uniqueToken: string;
	constructorParams: ConstructorData;
}

interface ControllerData {
	instance: any;
	name: string;
	constructorParams: ConstructorData;
}

interface ExportData {
	name: string;
	key: string;
}

interface NactModuleSettings {
	providers?: any[];
	controllers?: any[];
	import?: any[];
	export?: any[];
}

interface TransferModuleExportsOrImport {
	moduleKey: string;
	providerName: string;
}

interface ProviderLocation {
	name: string;
	key: string;
	resolved: boolean;
	moduleKey: string;
	instance: any;
}

export {
	ConstructorParam,
	ConstructorData,
	ProviderData,
	ControllerData,
	ExportData,
	NactModuleSettings,
	TransferModuleExportsOrImport,
	ProviderLocation,
};
