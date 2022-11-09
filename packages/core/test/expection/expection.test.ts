import { NactServer, isExpectionObject } from "../../";

import { ExpectionController, ClassExpectationsHandler } from "./expection.service";

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
