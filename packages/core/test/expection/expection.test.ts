import { NactServer } from "../../";
import { isExpectionObject } from "../../expections/utils";

import { ExpectionController, ClassExpectationsHandler, DecoratorExpections } from "./expection.service";

let server: NactServer;
const createTestServer = () => {
	const app = new NactServer("nact-expection-testing", { loggerEnabled: false });
	server = app;
	server.offline();
	return app;
};

server = createTestServer();

describe("Nact expections base handlers test", () => {
	afterAll(() => {
		server.clearModuleConfiguration();
	});

	beforeAll(async () => {
		await server.clearModuleConfiguration((key, tm) => {
			tm.useModule({
				controllers: [ExpectionController],
			});
		});
	});

	test("Standard expection handled", async () => {
		const res = await server.injectRequest({
			method: "GET",
			url: "/expections/standard/",
		});

		const payload = res?.getPayload();
		expect(isExpectionObject(payload)).toBeTruthy();
		expect(payload?.statusCode).toBe(404);
	});

	test("Custom expection handled", async () => {
		const res = await server.injectRequest({
			method: "GET",
			url: "/expections/custom/",
		});

		const payload = res?.getPayload();
		expect(payload).toMatchObject({ someValue: true, statusCode: 200, message: "Page not found" });
	});

	test("Should not be handled by method expection handled", async () => {
		const res = await server.injectRequest({
			method: "GET",
			url: "/expections/nothandled/",
		});

		const payload = res?.getPayload();
		expect(isExpectionObject(payload)).toBeTruthy();
		expect(payload).toMatchObject({ statusCode: 500, message: "Internal server error" });
	});
});

describe("Class method handler test", () => {
	afterAll(() => {
		server.clearModuleConfiguration();
	});

	beforeAll(async () => {
		await server.clearModuleConfiguration((key, tm) => {
			tm.useModule({
				controllers: [ClassExpectationsHandler],
			});
		});
	});

	test("Should be expection handled", async () => {
		const res = await server.injectRequest({
			method: "GET",
			url: "/expectionshandler/handled/",
		});

		const payload = res?.getPayload();
		expect(payload).toMatchObject({ someValue: true, statusCode: 200, message: "Page not found" });
	});

	test("Should not be handled by class expection handled", async () => {
		const res = await server.injectRequest({
			method: "GET",
			url: "/expectionshandler/nothandled/",
		});

		const payload = res?.getPayload();
		expect(payload).toMatchObject({ statusCode: 500, message: "Internal server error" });
	});

	test("Should be handled by method expection handled", async () => {
		const res = await server.injectRequest({
			method: "GET",
			url: "/expectionshandler/method/",
		});

		const payload = res?.getPayload();
		expect(payload).toMatchObject({ statusCode: 200, message: "Internal server error", someValue: false });
	});
});

describe("handling throwed expections from decorators", () => {
	afterAll(() => {
		server.clearModuleConfiguration();
	});

	beforeAll(async () => {
		await server.clearModuleConfiguration((key, tm) => {
			tm.useModule({
				controllers: [DecoratorExpections],
			});
		});
	});

	test("handling expection in middleware", async () => {
		const res = await server.injectRequest({
			method: "GET",
			url: "/decorator/middleware/",
		});

		const payload = res?.getPayload();
		expect(payload).toMatchObject({ statusCode: 404, message: "Page not found" });
	});

	test("handling expection in guard", async () => {
		const res = await server.injectRequest({
			method: "GET",
			url: "/decorator/guard/",
		});

		const payload = res?.getPayload();
		expect(payload).toMatchObject({ statusCode: 404, message: "Page not found" });
	});
});
