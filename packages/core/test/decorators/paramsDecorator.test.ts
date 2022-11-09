import { NactServer } from "../../application";

import { ParamsController } from "./test.service";

let server: NactServer;
const createTestServer = () => {
	const app = new NactServer("nact-param_decorator-testing", { loggerEnabled: false });
	server = app;
	server.offline();
	return app;
};

server = createTestServer();

describe("Nact params decorator test", () => {
	afterAll(() => {
		server.clearModuleConfiguration();
	});

	beforeAll(async () => {
		await server.clearModuleConfiguration((key, tm) => {
			tm.useModule({
				controllers: [ParamsController],
			});
		});
	});

	test("Using route with @Param decorator (1 param)", async () => {
		const res = await server.injectRequest({
			url: "/params/param",
			method: "GET",
		});

		expect(res?.getPayload()?.data).toBe(true);
	});

	test("Using route with @Param decorator (3 params)", async () => {
		const res = await server.injectRequest({
			url: "/params/2/admin/true",
			method: "GET",
		});

		expect(res?.getPayload()?.data).toBe(true);
	});

	test("Using route with @Param decorator and static path segment (2 params)", async () => {
		const res = await server.injectRequest({
			url: "/params/2/name/true",
			method: "GET",
		});

		expect(res?.getPayload()?.data).toBe(true);
	});

	test("Using route with @Reg", async () => {
		const res = await server.injectRequest({
			url: "/params/reguest/",
			method: "GET",
		});

		expect(res?.getPayload()?.data).toBe(true);
	});

	test("Using route with @Query", async () => {
		const res = await server.injectRequest({
			url: "/params/query/?somevalue=true",
			method: "GET",
		});

		expect(res?.getPayload()?.data).toBe(true);
	});

	test("Using route with @Query (2 params)", async () => {
		const res = await server.injectRequest({
			url: "/params/query2/?somevalue=true&new=false",
			method: "GET",
		});

		expect(res?.getPayload()?.data).toBe(true);
	});

	test("Using route with @Query Array", async () => {
		const res = await server.injectRequest({
			url: "/params/queryArray/?somevalue=true&somevalue=false",
			method: "GET",
		});

		expect(res?.getPayload()?.data).toBe(true);
	});

	test("Using route with @Body", async () => {
		const res = await server.injectRequest({
			url: "/params/body/",
			method: "POST",
			body: { value: "true" },
		});

		expect(res?.getPayload()?.data).toBe(true);
	});
});
