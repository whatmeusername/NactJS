import { getTransferModule, NactServer } from "@nactjs/core";
import { TypeORMModule } from "../lib";
import { TestMultipleTypeORMService } from "./typeorm.service";
import { TypeormTestEntity } from "./entity";

const createTestServer = () => {
	getTransferModule("nactjs-typeorm-multiple-module-testing").useRootModule(
		TypeORMModule.root([
			{
				type: "postgres",
				host: "localhost",
				port: 5432,
				username: "tester",
				password: "12345",
				database: "test",
				entities: [TypeormTestEntity],
				synchronize: true,
			},
			{
				type: "postgres",
				host: "localhost",
				port: 5432,
				username: "tester",
				password: "12345",
				database: "test1",
				entities: [TypeormTestEntity],
				synchronize: true,
			},
		]),
	);
	getTransferModule("nactjs-typeorm-multiple-module-testing").useModule({
		controllers: [TestMultipleTypeORMService],
		providers: [TypeORMModule.getRepositories([TypeormTestEntity], "test1")],
	});

	const app = new NactServer("nactjs-typeorm-multiple-module-testing", { loggerEnabled: false });
	return app;
};

const server: NactServer = createTestServer();

describe("nactjs typeorm module testing", () => {
	beforeAll(async () => {
		await server.offline();
		//@ts-ignore
	});
	afterAll(() => {
		server.emit("close");
	});
	test("can access to second ds", async () => {
		const res = await server.injectRequest({
			url: "/nactmultipletypeorm/secondisdefined/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe(true);
	});
	test("can access to first ds", async () => {
		const res = await server.injectRequest({
			url: "/nactmultipletypeorm/firstisdefined/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe(true);
	});
	test("check if repository is active", async () => {
		const res = await server.injectRequest({
			url: "/nactmultipletypeorm/repositoryisdefined/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe(true);
	});
});

//repositoryisinitialized
