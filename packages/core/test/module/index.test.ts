import {
	getTransferModule,
	createModule,
	createProvider,
	isInitializedClass,
	NactTransferModule,
	createNewTransferModule,
} from "../../Module/index";
// import { Inject } from "../../Decorators/Inject/index";
import NactServer from "../../../../app";

import { ServiceEmpty, AnotherEmptyService, ServiceA, ServiceB, ServiceC } from "./test.service";
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
		const provider = transferModule.getProviderLocationByName(service);
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

describe("Nact module testing (IoC / DI) | Custom Provider |  | injecting", () => {
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
	test("(2) Create custom provider with useFactory, that will return true", () => {
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
	test("(3) Create custom provider with useClass, that will return initialized class instance", () => {
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
	test("(3) Create custom provider with useFactory, that will use injectParameters. providers ordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					ServiceEmpty,
					createProvider({
						providerName: "custom_provider",
						useFactory: (Empty: ServiceEmpty) => {
							return isInitializedClass(Empty);
						},
						injectParameters: [ServiceEmpty],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(4) Create custom provider with useFactory, that will use injectParameters. providers unordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider",
						useFactory: (Empty: ServiceEmpty) => {
							return isInitializedClass(Empty);
						},
						injectParameters: [ServiceEmpty],
					}),
					ServiceEmpty,
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(5) Create custom provider with useFactory, that will use injectParameters. other module", () => {
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
						injectParameters: [ServiceEmpty],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(6) Create custom provider with useFactory, that will use injectParameters. Injectable service using other injections. providers ordered. same module", () => {
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
						injectParameters: [ServiceA],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(7) Create custom provider with useFactory, that will use injectParameters. Injectable service using other injections. providers unordered. same module", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					ServiceEmpty,
					createProvider({
						providerName: "custom_provider",
						useFactory: (Service: ServiceA) => {
							return isInitializedClass(Service);
						},
						injectParameters: [ServiceA],
					}),
					ServiceA,
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(8) Create custom provider with useFactory, that will use injectParameters. Injectable service using other injections. other module", () => {
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
						injectParameters: [ServiceA],
					}),
				],
			});
		});
		const result = getValueFromTestInstance("custom_provider");
		expect(result).toBe(true);
	});
	test("(9) Create custom provider with useFactory, that will use injectParameters. Injectable service using other injections. between modules", () => {
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
						injectParameters: [ServiceA],
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
	test("(10) Throw error injectParameters provided, if custom provider useFactory using arguments", () => {
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
							injectParameters: [],
						}),
					],
				});
			});
			fail();
		} catch (error: any) {
			expect(true).toBe(ErrorStringIsNactError(error.message ?? ""));
		}
	});
	test("(11) Injecting into useFactory another custom porvider. providers ordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider_1",
						useFactory: () => {
							return "Hello world";
						},
						injectParameters: [],
					}),
					createProvider({
						providerName: "custom_provider_2",
						useFactory: (SomeString: string) => {
							return typeof SomeString === "string";
						},
						injectParameters: ["custom_provider_1"],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider_2");
		expect(result).toBe(true);
	});
	test("(12) Injecting into useFactory another custom porvider. providers unordered", () => {
		server.clearModuleConfiguration(() => {
			createModule({
				providers: [
					createProvider({
						providerName: "custom_provider_2",
						useFactory: (SomeString: string) => {
							return typeof SomeString === "string";
						},
						injectParameters: ["custom_provider_1"],
					}),
					createProvider({
						providerName: "custom_provider_1",
						useFactory: () => {
							return "Hello world";
						},
						injectParameters: [],
					}),
				],
			});
		});

		const result = getValueFromTestInstance("custom_provider_2");
		expect(result).toBe(true);
	});
});
