import { getTransferModule, NactServer } from "@nactjs/core";
import { TypeORMModule } from "../lib";
import { TestTypeORMService } from "./typeorm.service";
import { TypeormTestEntity } from "./entity";

const createTestServer = () => {
	getTransferModule("nactjs-typeorm-module-testing").useRootModule(
		TypeORMModule.root({
			type: "postgres",
			host: "localhost",
			port: 5432,
			username: "tester",
			password: "12345",
			database: "test",
			entities: [TypeormTestEntity],
			synchronize: true,
		}),
	);
	getTransferModule("nactjs-typeorm-module-testing").useModule({
		controllers: [TestTypeORMService],
		providers: [TypeORMModule.getRepositories([TypeormTestEntity])],
	});

	const app = new NactServer("nactjs-typeorm-module-testing", { loggerEnabled: false });
	return app;
};

const server: NactServer = createTestServer();

describe("nactjs typeorm module testing", () => {
	beforeAll(async () => {
		await server.offline();
		//@ts-ignore
	});
	test("ds can be initialized", async () => {
		const res = await server.injectRequest({
			url: "/nacttypeorm/dsisdefined/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe(true);
	});
	test("can get repository", async () => {
		const res = await server.injectRequest({
			url: "/nacttypeorm/repositoryisdefined/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe(true);
	});
	test("check if repository is active", async () => {
		const res = await server.injectRequest({
			url: "/nacttypeorm/repositoryisdefined/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe(true);
	});
});

//repositoryisinitialized
