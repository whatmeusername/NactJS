import NactServer, { Controller } from "../../../../app";
import { createModule, getTransferModule } from "../../index";
import { BaseController1 } from "./test.controller";

const server = new NactServer("nact-request-test", { loggerEnabled: false });

describe("nact base routing functionality", () => {
	beforeAll(() => {
		server.clearModuleConfiguration((key, tm) => {
			tm.useModule({ controllers: [BaseController1] });
		});
	});

	test("request to static path", () => {
		const path = "/test/";
		const res = server.injectRequest({
			url: path,
			method: "GET",
		});
		console.log(res.payload);
	});
});
