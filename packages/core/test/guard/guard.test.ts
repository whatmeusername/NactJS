import { NactServer } from "../../application";
import { ClassGuardController, ClassGuardInstanceController, MethodGuardController } from "./test.service";
import { createNactTestingUtil } from "../utils";

let server: NactServer;
const createTestServer = () => {
	const app = new NactServer("nact-guard_decorator-testing", { loggerEnabled: false });
	server = app;
	server.offline();
	return app;
};
server = createTestServer();

describe("nact guards", () => {
	afterAll(() => {
		server.clearModuleConfiguration();
	});

	beforeAll(async () => {
		await server.clearModuleConfiguration((key, tm) => {
			tm.useModule({
				controllers: [MethodGuardController, ClassGuardController, ClassGuardInstanceController],
			});
		});
	});

	test("single guard testing, (method)", async () => {
		const res = await server.injectRequest({
			url: "/guard/single/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe("Hello world");
		createNactTestingUtil(res).status(401).done();
	});

	test("multiple guard testing, (method)", async () => {
		const res = await server.injectRequest({
			url: "/guard/multiple/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe("Hello world");
		createNactTestingUtil(res).status(200).done();
	});

	test("single guard testing, (method), must fail", async () => {
		const res = await server.injectRequest({
			url: "/guard/single/",
			method: "POST",
		});
		expect(res?.getPayload()).toBeNull();
		createNactTestingUtil(res).status(404).done();
	});

	test("multiple guard testing, (method), must fail", async () => {
		const res = await server.injectRequest({
			url: "/guard/multiple/",
			method: "POST",
		});
		expect(res?.getPayload()).toBeNull();
		createNactTestingUtil(res).status(404).done();
	});

	test("single guard testing, (class)", async () => {
		const res = await server.injectRequest({
			url: "/guardclass/single/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe("Hello world");
		createNactTestingUtil(res).status(401).done();
	});

	test("single guard testing, (class), must fail", async () => {
		const res = await server.injectRequest({
			url: "/guardclass/single/",
			method: "POST",
		});
		expect(res?.getPayload()).toBeNull();
		createNactTestingUtil(res).status(404).done();
	});

	test("guard class instance using (method)", async () => {
		const res = await server.injectRequest({
			url: "/guardclassusing/single/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe("Hello world");
		createNactTestingUtil(res).status(401).done();
	});

	test("guard class new instance using (method)", async () => {
		const res = await server.injectRequest({
			url: "/guardclassusing/usingnew/",
			method: "GET",
		});
		expect(res?.getPayload()?.data).toBe("Hello world");
		createNactTestingUtil(res).status(401).done();
	});

	test("guard class instance using (method) must fail", async () => {
		const res = await server.injectRequest({
			url: "/guardclassusing/single/",
			method: "POST",
		});
		expect(res?.getPayload()).toBeNull();
		createNactTestingUtil(res).status(404).done();
	});
});
