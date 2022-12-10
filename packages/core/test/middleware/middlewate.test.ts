import { NactServer } from "../../application";
import {
	MiddlewareController,
	MiddlewareClass1Controller,
	MiddlewareClass2Controller,
	MiddlewareClass3Controller,
	GlobalNactMiddleware2,
	MiddlewareClass4Controller,
} from "./test.service";
import { createNactTestingUtil } from "../utils";

let server: NactServer;
const createTestServer = () => {
	const app = new NactServer("nact-middleware_decorator-testing", { loggerEnabled: false });
	server = app;
	server.offline();
	return app;
};
server = createTestServer();

describe("nact middleware testing", () => {
	afterAll(() => {
		server.clearModuleConfiguration();
	});

	beforeAll(async () => {
		await server.clearModuleConfiguration((key, tm) => {
			tm.useModule({
				controllers: [
					MiddlewareController,
					MiddlewareClass1Controller,
					MiddlewareClass2Controller,
					MiddlewareClass3Controller,
					MiddlewareClass4Controller,
				],
			});
		});
	});

	test("nact middleware testing, using middleware class (method)", async () => {
		const res = await server.injectRequest({
			url: "/middleware/classinstance/",
			method: "GET",
		});
		expect(res).toBeTruthy();
		createNactTestingUtil(res).status(401).done();
	});

	test("nact middleware testing, function (standard) using (method)", async () => {
		const res = await server.injectRequest({
			url: "/middleware/methodstandard/",
			method: "GET",
		});
		expect(res).toBeTruthy();
		createNactTestingUtil(res).status(401).done();
	});

	test("nact middleware testing, function (type provided) using (method)", async () => {
		const res = await server.injectRequest({
			url: "/middleware/methodexpress/",
			method: "GET",
		});

		expect(res).toBeTruthy();
		createNactTestingUtil(res).status(500).done();
	});

	test("nact middleware testing, multiple functions (standard) using (method)", async () => {
		const res = await server.injectRequest({
			url: "/middleware/multiple/",
			method: "GET",
		});
		expect(res).toBeTruthy();
		createNactTestingUtil(res).status(401).done();
	});

	test("nact middleware testing, function (type provided) using (class)", async () => {
		const res = await server.injectRequest({
			url: "/middlewareclass1/methodexpress/",
			method: "GET",
		});
		expect(res).toBeTruthy();
		createNactTestingUtil(res).status(500).done();
	});

	test("nact middleware testing, multiple functions (standard) using (class)", async () => {
		const res = await server.injectRequest({
			url: "/middlewareclass2/multiple/",
			method: "GET",
		});
		expect(res).toBeTruthy();
		createNactTestingUtil(res).status(401).done();
	});

	test("nact middleware testing, function (standard) using (class)", async () => {
		const res = await server.injectRequest({
			url: "/middlewareclass3/methodstandard/",
			method: "GET",
		});

		expect(res).toBeTruthy();
		createNactTestingUtil(res).status(401).done();
	});

	test("nact middleware testing, class (use) using (class)", async () => {
		const res = await server.injectRequest({
			url: "/middlewareclass4/standard/",
			method: "GET",
		});

		expect(res).toBeTruthy();
		createNactTestingUtil(res).status(401).done();
	});
});

describe("nact global middleware", () => {
	afterAll(() => {
		server.clearModuleConfiguration();
	});

	beforeAll(async () => {
		await server.clearModuleConfiguration((key, tm) => {
			tm.useModule({
				controllers: [MiddlewareController],
			});
		});
		server.useMiddleware(GlobalNactMiddleware2);
	});

	test("global middleware", async () => {
		const res = await server.injectRequest({
			url: "/middleware/withoutmiddleware/",
			method: "GET",
		});

		createNactTestingUtil(res).status(401).done();
	});
});
