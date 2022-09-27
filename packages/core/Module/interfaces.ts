type classInstance = new (...args: any[]) => object;

interface ParameterData {
	name: string;
	index: number;
	type: string;
	optional?: boolean;
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
	reference?: string;
	isReady: boolean;
}

interface ControllerData {
	instance: any;
	name: string;
	constructorParams: ConstructorData;
	isReady: boolean;
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
	reference?: string;
}

type optionalArgument = { provide: classInstance | string; optional?: boolean };
interface NactCustomProviderSettings {
	providerName: string;
	useFactory?: (...args: any[]) => any;
	useValue?: any;
	useClass?: (new (...args: any[]) => object) | object;
	useAlias?: any;
	injectArguments?: (classInstance | string | optionalArgument)[];
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
