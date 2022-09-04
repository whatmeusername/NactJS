import {
	getTransferModule,
	createModule,
	createProvider,
	isInitializedClass,
	NactTransferModule,
	createNewTransferModule,
} from "../../Module/index";
import type { ProviderData } from "../../Module/index";
// import { Inject } from "../../Decorators/Inject/index";
import NactServer from "../../../../app";

import { ServiceEmpty, AnotherEmptyService, ServiceA, ServiceB, ServiceC, ServiceAlias } from "./test.service";
import { fail } from "assert";

type ServiceInstanceOrName = { new (...args: any): void } | string;

let server: NactServer;
const createTestServer = () => {
	const app = new NactServer({ loggerEnabled: false });
	app.listen(8080);
	server = app;
	return app;
};

server = createTestServer();

const ErrorStringIsNactError = (string: string): boolean => {
	return string.includes("NACT ERROR");
};
const getValueFromTestInstance = (service: ServiceInstanceOrName[] | ServiceInstanceOrName): boolean => {
	const services = Array.isArray(service) ? service : [service];
	const transferModule = getTransferModule();

	let result = false;
	for (let i = 0; i < services.length; i++) {
		const service = services[i];
		const provider = transferModule.getProviderFromLocationByName(service);
		if (provider && provider?.resolved) {
			const instance = provider?.instance;

			if (isInitializedClass(instance)) {
				result = instance.getValue() ?? false;
			} else {
				result = instance === true;
			}
			if (!result) break;
		}
	}
	return result;
};

const getProviderFromTransfer = (service: ServiceInstanceOrName | ServiceInstanceOrName): ProviderData => {
	const transferModule = getTransferModule();
	return transferModule.getProviderFromLocationByName(service);
};

describe("Nact transfer module methods testing", () => {
	test("Should return TransferModule even if no instance exists", () => {
		const transferModule = getTransferModule();
		expect(transferModule).toBeInstanceOf(NactTransferModule);
	});
	test("Creating new TransferModule return clear TransferModule", () => {
		const transferModule = createNewTransferModule();
		expect(transferModule.length).toBe(0);
	});
	test("Should apppend new module", () => {
		const transferModule = getTransferModule();
		const moduleKey = createModule({
			providers: [ServiceEmpty],
		});
		expect(transferModule.hasModule(moduleKey)).toBe(true);

		createNewTransferModule();
	});
});

describe("Nact module testing (IoC / DI) | Class instances | Import / export | injecting", () => {
	test("(1) Should Standard service is resolved and ready to work ", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty],
			});
		});

		const result = getValueFromTestInstance(ServiceEmpty);
		expect(result).toBe(true);
	});

	test("(2) Multiple modules with no imports or exports", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty],
			});
			createModule({
				providers: [AnotherEmptyService],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, AnotherEmptyService]);
		expect(result).toBe(true);
	});

	test("(3) Service with injecting other service. services ordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty, ServiceA],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA]);
		expect(result).toBe(true);
	});

	test("(4) Service with injecting other service. services unordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceA, ServiceEmpty],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA]);
		expect(result).toBe(true);
	});

	test("(5) Service with injecting other service. export / import. Modules ordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty],
				export: [ServiceEmpty],
			});
			createModule({
				import: [ServiceEmpty],
				providers: [ServiceA],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA]);
		expect(result).toBe(true);
	});

	test("(6) Service with injecting other service. export / import. Modules unordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				import: [ServiceEmpty],
				providers: [ServiceA],
			});
			createModule({
				providers: [ServiceEmpty],
				export: [ServiceEmpty],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA]);
		expect(result).toBe(true);
	});

	test("(7) Service with injecting other service, that contains other injections. services ordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty, ServiceA, ServiceB, ServiceC],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA, ServiceB, ServiceC]);
		expect(result).toBe(true);
	});

	test("(8) Service with injecting other service, that contains other injections. services unordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty, ServiceA, ServiceB, ServiceC],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA, ServiceB, ServiceC]);
		expect(result).toBe(true);
	});

	test("(9) Service with injecting other service, that contains other injections. services random position. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceA, ServiceC, ServiceB, ServiceEmpty],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA, ServiceB, ServiceC]);
		expect(result).toBe(true);
	});

	test("(10) Service with injecting other service, that contains other injections. 2 modules. Modules oredered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty, ServiceA],
				export: [ServiceEmpty, ServiceA],
			});
			createModule({
				import: [ServiceEmpty, ServiceA],
				providers: [ServiceB, ServiceC],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA, ServiceB, ServiceC]);
		expect(result).toBe(true);
	});

	test("(11) Service with injecting other service, that contains other injections. 2 modules. Modules unordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				import: [ServiceEmpty, ServiceA],
				providers: [ServiceB, ServiceC],
			});
			createModule({
				providers: [ServiceEmpty, ServiceA],
				export: [ServiceEmpty, ServiceA],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA, ServiceB, ServiceC]);
		expect(result).toBe(true);
	});

	test("(12) Service with injecting other service, that contains other injections. 4 modules. Modules ordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty],
				export: [ServiceEmpty],
			});
			createModule({
				import: [ServiceEmpty],
				providers: [ServiceA],
				export: [ServiceA],
			});
			createModule({
				import: [ServiceEmpty, ServiceA],
				providers: [ServiceB],
				export: [ServiceB],
			});
			createModule({
				import: [ServiceEmpty, ServiceA, ServiceB],
				providers: [ServiceC],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA, ServiceB, ServiceC]);
		expect(result).toBe(true);
	});

	test("(13) Service with injecting other service, that contains other injections. 4 modules. Modules unordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				import: [ServiceEmpty],
				providers: [ServiceA],
				export: [ServiceA],
			});
			createModule({
				import: [ServiceEmpty, ServiceA],
				providers: [ServiceB],
				export: [ServiceB],
			});
			createModule({
				import: [ServiceEmpty, ServiceA, ServiceB],
				providers: [ServiceC],
			});
			createModule({
				providers: [ServiceEmpty],
				export: [ServiceEmpty],
			});
		});

		const result = getValueFromTestInstance([ServiceEmpty, ServiceA, ServiceB, ServiceC]);
		expect(result).toBe(true);
	});

	test("(14) Throw error if no provider dont have needed provider", () => {
		try {
			server.clearModuleConfiguration(() => {
				createModule({
					providers: [ServiceA],
				});
			});
			fail();
		} catch (error: any) {
			expect(true).toBe(ErrorStringIsNactError(error.message));
		}
	});

	test("(15) Throw error if no provider dont have needed provider, beacause is not imported", () => {
		try {
			server.clearModuleConfiguration(() => {
				createModule({
					providers: [ServiceEmpty],
					export: [ServiceEmpty],
				});
				createModule({
					providers: [ServiceA],
				});
			});
			fail();
		} catch (error: any) {
			expect(true).toBe(ErrorStringIsNactError(error.message));
		}
	});
});

describe("Nact testing method 'useValue' custom provider", () => {
	test("(1) Create custom provider with useValue, that will return true", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider",
						useValue: true,
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(2) Create custom provider with useValue, that will return undefined", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider",
						useValue: undefined,
					}),
				],
			});
		});

		const result = getProviderFromTransfer("custom_provider")?.instance;
		expect(result).toBeUndefined();
	});
	test("(3) Create custom provider with useValue, that will return null", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider",
						useValue: null,
					}),
				],
			});
		});

		const result = getProviderFromTransfer("custom_provider")?.instance;
		expect(result).toBeNull();
	});
	test("(4) Create custom provider with useValue, that will return 0", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider",
						useValue: 0,
					}),
				],
			});
		});

		const result = getProviderFromTransfer("custom_provider")?.instance;
		expect(result).toBe(0);
	});
});

describe("Nact testing method 'useClass' custom provider", () => {
	test("(1) Create custom provider with useClass, that will return initialized class instance", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider",
						useClass: ServiceEmpty,
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(2) Checking if useClass can accept initialized classes", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider",
						useClass: new ServiceEmpty(),
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(3) Checking if useClass can not accept non class instances", () => {
		try {
			server.clearModuleConfiguration(() => {
				createModule({
					providers: [
						createProvider({
							providerName: "custom_provider",
							//@ts-ignore Ignoring for testing purposes
							useClass: "Hello world",
						}),
					],
				});
			});
			fail();
		} catch (err: any) {
			expect(true).toBe(ErrorStringIsNactError(err.message));
		}
	});
});

describe("Nact testing method 'useFactory' custom provider", () => {
	test("(1) Create custom provider with useFactory, that will return true", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider",
						useFactory: () => true,
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(2) Create custom provider with useFactory, that will use injectArguments. providers ordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					ServiceEmpty,
					createProvider({
						providerName: "custom_provider",
						useFactory: (Empty: ServiceEmpty) => {
							return isInitializedClass(Empty);
						},
						injectArguments: [ServiceEmpty],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(3) Create custom provider with useFactory, that will use injectArguments. providers unordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider",
						useFactory: (Empty: ServiceEmpty) => {
							return isInitializedClass(Empty);
						},
						injectArguments: [ServiceEmpty],
					}),
					ServiceEmpty,
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(4) Create custom provider with useFactory, that will use injectArguments. other module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty],
				export: [ServiceEmpty],
			});
			createModule({
				import: [ServiceEmpty],
				providers: [
					createProvider({
						providerName: "custom_provider",
						useFactory: (Empty: ServiceEmpty) => {
							return isInitializedClass(Empty);
						},
						injectArguments: [ServiceEmpty],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(5) Create custom provider with useFactory, that will use injectArguments. Injectable service using other injections. providers ordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					ServiceEmpty,
					ServiceA,
					createProvider({
						providerName: "custom_provider",
						useFactory: (Service: ServiceA) => {
							return isInitializedClass(Service);
						},
						injectArguments: [ServiceA],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(6) Create custom provider with useFactory, that will use injectArguments. Injectable service using other injections. providers unordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					ServiceEmpty,
					createProvider({
						providerName: "custom_provider",
						useFactory: (Service: ServiceA) => {
							return isInitializedClass(Service);
						},
						injectArguments: [ServiceA],
					}),
					ServiceA,
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(7) Create custom provider with useFactory, that will use injectArguments. Injectable service using other injections. other module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty, ServiceA],
				export: [ServiceA],
			});
			createModule({
				import: [ServiceA],
				providers: [
					createProvider({
						providerName: "custom_provider",
						useFactory: (Service: ServiceA) => {
							return isInitializedClass(Service);
						},
						injectArguments: [ServiceA],
					}),
				],
			});
		});
		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(8) Create custom provider with useFactory, that will use injectArguments. Injectable service using other injections. between modules", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [ServiceEmpty],
				export: [ServiceEmpty],
			});
			createModule({
				import: [ServiceA],
				providers: [
					createProvider({
						providerName: "custom_provider",
						useFactory: (Service: ServiceA) => {
							return isInitializedClass(Service);
						},
						injectArguments: [ServiceA],
					}),
				],
			});
			createModule({
				import: [ServiceEmpty],
				providers: [ServiceA],
				export: [ServiceA],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(9) Throw error injectArguments provided, if custom provider useFactory using arguments", () => {
		try {
			server.clearModuleConfiguration(() => {
				createModule({
					providers: [
						ServiceEmpty,
						createProvider({
							providerName: "custom_provider",
							useFactory: (Service: ServiceEmpty) => {
								return isInitializedClass(Service);
							},
							injectArguments: [],
						}),
					],
				});
			});
			fail();
		} catch (error: any) {
			expect(true).toBe(ErrorStringIsNactError(error.message ?? ""));
		}
	});
	test("(10) Injecting into useFactory another custom porvider. providers ordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider_1",
						useFactory: () => {
							return "Hello world";
						},
						injectArguments: [],
					}),
					createProvider({
						providerName: "custom_provider_2",
						useFactory: (SomeString: string) => {
							return typeof SomeString === "string";
						},
						injectArguments: ["custom_provider_1"],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider_2");
		expect(result).toBe(true);
	});
	test("(11) Injecting into useFactory another custom porvider. providers unordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider_2",
						useFactory: (SomeString: string) => {
							return typeof SomeString === "string";
						},
						injectArguments: ["custom_provider_1"],
					}),
					createProvider({
						providerName: "custom_provider_1",
						useFactory: () => {
							return "Hello world";
						},
						injectArguments: [],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider_2");
		expect(result).toBe(true);
	});
	test("(12) Injecting into useFactory another custom porvider (optional, provided)", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					ServiceEmpty,
					createProvider({
						providerName: "custom_provider",
						useFactory: (Service: ServiceEmpty) => {
							return Service !== undefined;
						},
						injectArguments: [{ provide: ServiceEmpty, optional: true }],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(13) Injecting into useFactory another custom porvider (optional, not provided)", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					ServiceEmpty,
					createProvider({
						providerName: "custom_provider",
						useFactory: (Service: ServiceEmpty) => {
							return Service === undefined;
						},
						injectArguments: [{ provide: "ServiceEmpty1", optional: true }],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
});

describe("Nact testing method 'useAlias' custom provider", () => {
	test("(1) custom provider useAlias. providers ordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					ServiceEmpty,
					createProvider({
						providerName: "AnotherEmptyService",
						useAlias: ServiceEmpty,
					}),
				],
			});
		});

		const provider = getProviderFromTransfer("AnotherEmptyService");
		expect(provider?.instance).toBeInstanceOf(ServiceEmpty);
	});
	test("(2) custom provider useAlias. providers unordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "AnotherEmptyService",
						useAlias: ServiceEmpty,
					}),
					ServiceEmpty,
				],
			});
		});

		const provider = getProviderFromTransfer("AnotherEmptyService");
		expect(provider?.instance).toBeInstanceOf(ServiceEmpty);
	});
	test("(3) providier injecting custom provider with useAlias. providers ordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					ServiceEmpty,
					createProvider({
						providerName: "AnotherEmptyService",
						useAlias: ServiceEmpty,
					}),
					ServiceAlias,
				],
			});
		});

		const result = getValueFromTestInstance(ServiceAlias);
		expect(result).toBe(true);
	});
	test("(4) providier injecting custom provider with useAlias. providers unordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					ServiceAlias,
					createProvider({
						providerName: "AnotherEmptyService",
						useAlias: ServiceEmpty,
					}),
					ServiceEmpty,
				],
			});
		});

		const result = getValueFromTestInstance(ServiceAlias);
		expect(result).toBe(true);
	});
	test("(4) providier injecting custom provider with useAlias. providers unordered. using imports / exports. module ordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "AnotherEmptyService",
						useAlias: ServiceEmpty,
					}),
					ServiceEmpty,
				],
				export: ["AnotherEmptyService"],
			});
			createModule({
				import: ["AnotherEmptyService"],
				providers: [ServiceAlias],
			});
		});

		const result = getValueFromTestInstance(ServiceAlias);
		expect(result).toBe(true);
	});
	test("(4) providier injecting custom provider with useAlias. providers unordered. using imports / exports. module unordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				import: ["AnotherEmptyService"],
				providers: [ServiceAlias],
			});
			createModule({
				providers: [
					createProvider({
						providerName: "AnotherEmptyService",
						useAlias: ServiceEmpty,
					}),
					ServiceEmpty,
				],
				export: ["AnotherEmptyService"],
			});
		});

		const result = getValueFromTestInstance(ServiceAlias);
		expect(result).toBe(true);
	});
	test("(5) using 'useAlias' on another custom provider", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "ProviderThatWillBeUsed",
						useClass: ServiceEmpty,
					}),
					createProvider({
						providerName: "AnotherEmptyService",
						useAlias: "ProviderThatWillBeUsed",
					}),
					ServiceAlias,
				],
			});
		});

		const result = getValueFromTestInstance(ServiceAlias);
		expect(result).toBe(true);
	});
});
