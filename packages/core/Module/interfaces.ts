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
	useFactory?: (...args: any[]) => object;
	useValue?: any;
	useClass?: (new (...args: any[]) => object) | object;
	injectParameters?: string[];
}

interface NactCustomProvider extends NactCustomProviderSettings {
	willBeResolvedBy: string;
	uniqueToken: string;
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
	NactCustomProviderSettings,
	NactCustomProvider,
};
