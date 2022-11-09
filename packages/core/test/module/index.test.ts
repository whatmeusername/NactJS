import { createProvider, NactTransferModule, createNewTransferModule } from "../../module/index";
import { NactServer } from "../../application";

import { isInitializedClass } from "../../shared";

import { ServiceEmpty, AnotherEmptyService, ServiceA, ServiceB, ServiceC, ServiceAlias } from "./test.service";
import { ErrorStringIsNactError, getValueFromTestInstance, getProviderFromTransfer } from "../utils/utils";

let server: NactServer;
const createTestServer = () => {
	const app = new NactServer("nact-module-testing", { loggerEnabled: false });
	server = app;
	server.offline();
	return app;
};

server = createTestServer();

describe("Nact modyle system testing", () => {
	afterAll(() => {
		server.clearModuleConfiguration();
	});

	describe("Nact module providers listeners testing", () => {
		test("should fire onInstanceReady listerner on instance ready if has", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty],
				});
			});

			const provider = getProviderFromTransfer(server, ServiceEmpty).instance;
			expect(provider.someValue).toBeTruthy();
		});
	});

	describe("Nact transfer module methods testing", () => {
		test("Should return TransferModule even if no instance exists", () => {
			const transferModule = server.getTransferModule();
			expect(transferModule).toBeInstanceOf(NactTransferModule);
		});
		test("Should apppend new module", () => {
			const transferModule = server.getTransferModule();
			const moduleKey = transferModule.useModule({
				providers: [ServiceEmpty],
			});
			expect(transferModule.hasModule(moduleKey)).toBe(true);

			createNewTransferModule(server.getTransferModuleKey());
		});
	});

	describe("Nact module testing (IoC / DI) | Class instances | Import / export | injecting", () => {
		test("(1) Should Standard service is resolved and ready to work ", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty],
				});
			});

			const result = getValueFromTestInstance(server, ServiceEmpty);
			expect(result).toBe(true);
		});

		test("(2) Multiple modules with no imports or exports", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty],
				});
				tm.useModule({
					providers: [AnotherEmptyService],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, AnotherEmptyService]);
			expect(result).toBe(true);
		});

		test("(3) Service with injecting other service. services ordered. same module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty, ServiceA],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA]);
			expect(result).toBe(true);
		});

		test("(4) Service with injecting other service. services unordered. same module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceA, ServiceEmpty],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA]);
			expect(result).toBe(true);
		});

		test("(5) Service with injecting other service. export / import. Modules ordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty],
					export: [ServiceEmpty],
				});
				tm.useModule({
					import: [ServiceEmpty],
					providers: [ServiceA],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA]);
			expect(result).toBe(true);
		});

		test("(6) Service with injecting other service. export / import. Modules unordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					import: [ServiceEmpty],
					providers: [ServiceA],
				});
				tm.useModule({
					providers: [ServiceEmpty],
					export: [ServiceEmpty],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA]);
			expect(result).toBe(true);
		});

		test("(7) Service with injecting other service, that contains other injections. services ordered. same module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty, ServiceA, ServiceB, ServiceC],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA, ServiceB, ServiceC]);
			expect(result).toBe(true);
		});

		test("(8) Service with injecting other service, that contains other injections. services unordered. same module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty, ServiceA, ServiceB, ServiceC],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA, ServiceB, ServiceC]);
			expect(result).toBe(true);
		});

		test("(9) Service with injecting other service, that contains other injections. services random position. same module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceA, ServiceC, ServiceB, ServiceEmpty],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA, ServiceB, ServiceC]);
			expect(result).toBe(true);
		});

		test("(10) Service with injecting other service, that contains other injections. 2 modules. Modules oredered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty, ServiceA],
					export: [ServiceEmpty, ServiceA],
				});
				tm.useModule({
					import: [ServiceEmpty, ServiceA],
					providers: [ServiceB, ServiceC],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA, ServiceB, ServiceC]);
			expect(result).toBe(true);
		});

		test("(11) Service with injecting other service, that contains other injections. 2 modules. Modules unordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					import: [ServiceEmpty, ServiceA],
					providers: [ServiceB, ServiceC],
				});
				tm.useModule({
					providers: [ServiceEmpty, ServiceA],
					export: [ServiceEmpty, ServiceA],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA, ServiceB, ServiceC]);
			expect(result).toBe(true);
		});

		test("(12) Service with injecting other service, that contains other injections. 4 modules. Modules ordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty],
					export: [ServiceEmpty],
				});
				tm.useModule({
					import: [ServiceEmpty],
					providers: [ServiceA],
					export: [ServiceA],
				});
				tm.useModule({
					import: [ServiceEmpty, ServiceA],
					providers: [ServiceB],
					export: [ServiceB],
				});
				tm.useModule({
					import: [ServiceEmpty, ServiceA, ServiceB],
					providers: [ServiceC],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA, ServiceB, ServiceC]);
			expect(result).toBe(true);
		});

		test("(13) Service with injecting other service, that contains other injections. 4 modules. Modules unordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					import: [ServiceEmpty],
					providers: [ServiceA],
					export: [ServiceA],
				});
				tm.useModule({
					import: [ServiceEmpty, ServiceA],
					providers: [ServiceB],
					export: [ServiceB],
				});
				tm.useModule({
					import: [ServiceEmpty, ServiceA, ServiceB],
					providers: [ServiceC],
				});
				tm.useModule({
					providers: [ServiceEmpty],
					export: [ServiceEmpty],
				});
			});

			const result = getValueFromTestInstance(server, [ServiceEmpty, ServiceA, ServiceB, ServiceC]);
			expect(result).toBe(true);
		});

		test("(14) Throw error if no provider dont have needed provider", async () => {
			try {
				await server.clearModuleConfiguration((key, tm) => {
					tm.useModule({
						providers: [ServiceA],
					});
				});
				fail();
			} catch (error: any) {
				expect(true).toBe(ErrorStringIsNactError(error.message));
			}
		});

		test("(15) Throw error if no provider dont have needed provider, beacause is not imported", async () => {
			try {
				await server.clearModuleConfiguration((key, tm) => {
					tm.useModule({
						providers: [ServiceEmpty],
						export: [ServiceEmpty],
					});
					tm.useModule({
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
		test("(1) Create custom provider with useValue, that will return true", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [
						createProvider({
							providerName: "custom_provider",
							useValue: true,
						}),
					],
				});
			});

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(2) Create custom provider with useValue, that will return undefined", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [
						createProvider({
							providerName: "custom_provider",
							useValue: undefined,
						}),
					],
				});
			});

			const result = getProviderFromTransfer(server, "custom_provider")?.instance;
			expect(result).toBeUndefined();
		});
		test("(3) Create custom provider with useValue, that will return null", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [
						createProvider({
							providerName: "custom_provider",
							useValue: null,
						}),
					],
				});
			});

			const result = getProviderFromTransfer(server, "custom_provider")?.instance;
			expect(result).toBeNull();
		});
		test("(4) Create custom provider with useValue, that will return 0", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [
						createProvider({
							providerName: "custom_provider",
							useValue: 0,
						}),
					],
				});
			});

			const result = getProviderFromTransfer(server, "custom_provider")?.instance;
			expect(result).toBe(0);
		});
	});

	describe("Nact testing method 'useClass' custom provider", () => {
		test("(1) Create custom provider with useClass, that will return initialized class instance", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [
						createProvider({
							providerName: "custom_provider",
							useClass: ServiceEmpty,
						}),
					],
				});
			});

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(2) Checking if useClass can accept initialized classes", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [
						createProvider({
							providerName: "custom_provider",
							useClass: new ServiceEmpty(),
						}),
					],
				});
			});

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(3) Checking if useClass can not accept non class instances", async () => {
			try {
				await server.clearModuleConfiguration((key, tm) => {
					tm.useModule({
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
		test("(1) Create custom provider with useFactory, that will return true", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [
						createProvider({
							providerName: "custom_provider",
							useFactory: () => true,
						}),
					],
				});
			});

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(2) Create custom provider with useFactory, that will use injectArguments. providers ordered. same module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(3) Create custom provider with useFactory, that will use injectArguments. providers unordered. same module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(4) Create custom provider with useFactory, that will use injectArguments. other module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty],
					export: [ServiceEmpty],
				});
				tm.useModule({
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

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(5) Create custom provider with useFactory, that will use injectArguments. Injectable service using other injections. providers ordered. same module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(6) Create custom provider with useFactory, that will use injectArguments. Injectable service using other injections. providers unordered. same module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(7) Create custom provider with useFactory, that will use injectArguments. Injectable service using other injections. other module", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty, ServiceA],
					export: [ServiceA],
				});
				tm.useModule({
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
			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(8) Create custom provider with useFactory, that will use injectArguments. Injectable service using other injections. between modules", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [ServiceEmpty],
					export: [ServiceEmpty],
				});
				tm.useModule({
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
				tm.useModule({
					import: [ServiceEmpty],
					providers: [ServiceA],
					export: [ServiceA],
				});
			});

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(9) Throw error injectArguments provided, if custom provider useFactory using arguments", async () => {
			try {
				await server.clearModuleConfiguration((key, tm) => {
					tm.useModule({
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
		test("(10) Injecting into useFactory another custom porvider. providers ordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, "custom_provider_2");
			expect(result).toBe(true);
		});
		test("(11) Injecting into useFactory another custom porvider. providers unordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, "custom_provider_2");
			expect(result).toBe(true);
		});
		test("(12) Injecting into useFactory another custom porvider (optional, provided)", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
		test("(13) Injecting into useFactory another custom porvider (optional, not provided)", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, "custom_provider");
			expect(result).toBe(true);
		});
	});

	describe("Nact testing method 'useAlias' custom provider", () => {
		test("(1) custom provider useAlias. providers ordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [
						ServiceEmpty,
						createProvider({
							providerName: "AnotherEmptyService",
							useAlias: ServiceEmpty,
						}),
					],
				});
			});

			const provider = getProviderFromTransfer(server, "AnotherEmptyService");
			expect(provider?.instance).toBeInstanceOf(ServiceEmpty);
		});
		test("(2) custom provider useAlias. providers unordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [
						createProvider({
							providerName: "AnotherEmptyService",
							useAlias: ServiceEmpty,
						}),
						ServiceEmpty,
					],
				});
			});

			const provider = getProviderFromTransfer(server, "AnotherEmptyService");
			expect(provider?.instance).toBeInstanceOf(ServiceEmpty);
		});
		test("(3) providier injecting custom provider with useAlias. providers ordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, ServiceAlias);
			expect(result).toBe(true);
		});
		test("(4) providier injecting custom provider with useAlias. providers unordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, ServiceAlias);
			expect(result).toBe(true);
		});
		test("(4) providier injecting custom provider with useAlias. providers unordered. using imports / exports. module ordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					providers: [
						createProvider({
							providerName: "AnotherEmptyService",
							useAlias: ServiceEmpty,
						}),
						ServiceEmpty,
					],
					export: ["AnotherEmptyService"],
				});
				tm.useModule({
					import: ["AnotherEmptyService"],
					providers: [ServiceAlias],
				});
			});

			const result = getValueFromTestInstance(server, ServiceAlias);
			expect(result).toBe(true);
		});
		test("(4) providier injecting custom provider with useAlias. providers unordered. using imports / exports. module unordered", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
					import: ["AnotherEmptyService"],
					providers: [ServiceAlias],
				});
				tm.useModule({
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

			const result = getValueFromTestInstance(server, ServiceAlias);
			expect(result).toBe(true);
		});
		test("(5) using 'useAlias' on another custom provider", async () => {
			await server.clearModuleConfiguration((key, tm) => {
				tm.useModule({
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

			const result = getValueFromTestInstance(server, ServiceAlias);
			expect(result).toBe(true);
		});
	});
});
