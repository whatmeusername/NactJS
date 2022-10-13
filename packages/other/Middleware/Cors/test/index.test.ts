import NactCors from "../middleware";
import { createModule } from "../../../../core/module/index";
import { NactRequest } from "../../../../core/nact-request/index";
import { Get, Controller } from "../../../../core/decorators";
import { NactServer } from "../../../../core/application";
import { NactResponseTestingUtil } from "../../../../core/test/utils";

function createNactTestingUtil(NactRequest: NactRequest | undefined) {
	return new NactResponseTestingUtil(NactRequest);
}

@Controller("/")
class TestController {
	constructor() {}

	@Get("/")
	TestRoute() {
		return { res: "passed" };
	}
}

createModule({ controllers: [TestController] });

describe("Cors middleware testing", () => {
	let server: NactServer;
	let serverURL = "";

	beforeAll(async () => {
		server = new NactServer("nact-cors-test", { loggerEnabled: false });
		serverURL = server.getServerURL() ?? "";
	});

	beforeEach(() => {
		server.resetConfiguration();
	});

	test("Should have cors headers", async () => {
		server.useMiddleware(NactCors());
		const injectedResponse = await server.injectRequest({ method: "GET", headers: {}, url: serverURL });
		createNactTestingUtil(injectedResponse).header("access-control-allow-origin", "*").done();
	});

	test("Should have self referencing origin", async () => {
		//@ts-ignore checking if allowed origin will be request origin
		server.useMiddleware(NactCors({ allowedOrigin: null }));
		const injectedResponse = await server.injectRequest({ method: "GET", headers: {}, url: serverURL });
		createNactTestingUtil(injectedResponse).header("access-control-allow-origin", injectedResponse?.getOrigin()).done();
	});

	test("Should have multiple origins", async () => {
		//@ts-ignore checking if allowed origin will be request origin
		server.useMiddleware(NactCors({ allowedOrigin: ["localhost", "127.0.0.1"] }));
		const injectedResponse = await server.injectRequest({ method: "GET", headers: {}, url: serverURL });
		createNactTestingUtil(injectedResponse).header("access-control-allow-origin", "localhost,127.0.0.1").done();
	});

	test("sending preflight request", async () => {
		//@ts-ignore checking if allowed origin will be request origin
		server.useMiddleware(
			NactCors({
				allowedOrigin: ["localhost", "127.0.0.1"],
				allowedMethods: ["GET", "POST"],
				exposedHeaders: ["Content-Type"],
				maxAge: 1000,
			}),
		);
		const injectedResponse = await server.injectRequest({ method: "OPTIONS", headers: {}, url: serverURL });
		createNactTestingUtil(injectedResponse)
			.header("access-control-allow-origin", "localhost,127.0.0.1")
			.header("access-control-allow-methods", "GET,POST")
			.header("access-control-max-age", 1000)
			.length(0)
			.status(200)
			.done();
	});

	test("If origin is false then no headers set", async () => {
		//@ts-ignore checking if allowed origin will be request origin
		server.useMiddleware(NactCors({ allowedOrigin: false }));
		const injectedResponse = await server.injectRequest({ method: "GET", headers: {}, url: serverURL });

		createNactTestingUtil(injectedResponse)
			.header("access-control-allow-origin", undefined)
			.header("access-control-allow-credentials", undefined)
			.header("access-control-expose-headers", undefined)
			.done();
	});

	// test("Set only non empty values from origin array", async () => {
	// 	server.useMiddleware(
	// 		NactCors({
	// 			allowedOrigin: ["     ", "localhost", "127.0.0.1", " "],
	// 		}),
	// 	);
	// 	const injectedResponse = await server.injectRequest({ method: "GET", headers: {}, url: serverURL });

	// 	createNactTestingUtil(injectedResponse).header("access-control-allow-origin", "localhost,127.0.0.1").done();
	// });
});
