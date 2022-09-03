interface ParameterData {
	name: string;
	index: number;
	type: string;
}

interface ConstructorData {
	params: ParameterData[];
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
	providers?: (any | NactCustomProvider)[];
	controllers?: any[];
	import?: ((new (...args: any[]) => object) | string)[];
	export?: ((new (...args: any[]) => object) | string)[];
	isRoot?: boolean;
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

interface NactCustomProviderSettings {
	providerName: string;
	useFactory?: (...args: any[]) => any;
	useValue?: any;
	useClass?: (new (...args: any[]) => object) | object;
	injectParameters?: ((new (...args: any[]) => object) | string)[];
}

interface NactCustomProvider extends NactCustomProviderSettings {
	willUse: string;
	uniqueToken: string;
}

export {
	ParameterData,
	ConstructorData,
	ProviderData,
	ControllerData,
	ExportData,
	NactModuleSettings,
	TransferModuleExportsOrImport,
	ProviderLocation,
	NactCustomProviderSettings,
	NactCustomProvider,
};
