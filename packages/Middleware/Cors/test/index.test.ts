import NactServer, { Controller } from "../../../../index";
import NactCors from "../middleware";
import { createModule } from "../../../Module/index";
import { NactRequest } from "../../../nact-request/index";
import { Get } from "../../../Decorators/index";
import { NactResponseTestingUtil } from "../../../utils/TestingUtils";

function createNactTestingUtil(NactRequest: NactRequest) {
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

const createSimplyServer = async (port: number) => {
	const server = new NactServer({ loggerEnabled: false });
	server.listen(port);
	await sleep(250);
	return server;
};

function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

describe("Cors middleware testing", () => {
	let server: NactServer;
	let serverURL = "";

	beforeAll(async () => {
		server = (await createSimplyServer(8000)) as any;
		serverURL = server.serverRunningURL ?? "";
	});

	beforeEach(() => {
		server.resetConfiguration();
	});

	test("Should have cors headers", () => {
		server.useMiddleware(NactCors());
		const injectedResponse = server.injectRequest({ method: "GET", headers: {}, url: serverURL });
		createNactTestingUtil(injectedResponse).header("access-control-allow-origin", "*").done();
	});

	test("Should have self referencing origin", () => {
		//@ts-ignore checking if allowed origin will be request origin
		server.useMiddleware(NactCors({ allowedOrigin: null }));
		const injectedResponse = server.injectRequest({ method: "GET", headers: {}, url: serverURL });
		createNactTestingUtil(injectedResponse).header("access-control-allow-origin", injectedResponse.origin).done();
	});

	test("Should have multiple origins", () => {
		//@ts-ignore checking if allowed origin will be request origin
		server.useMiddleware(NactCors({ allowedOrigin: ["localhost", "127.0.0.1"] }));
		const injectedResponse = server.injectRequest({ method: "GET", headers: {}, url: serverURL });
		createNactTestingUtil(injectedResponse).header("access-control-allow-origin", "localhost,127.0.0.1").done();
	});

	test("sending preflight request", () => {
		//@ts-ignore checking if allowed origin will be request origin
		server.useMiddleware(
			NactCors({
				allowedOrigin: ["localhost", "127.0.0.1"],
				allowedMethods: ["GET", "POST"],
				exposedHeaders: ["Content-Type"],
				maxAge: 1000,
			})
		);
		const injectedResponse = server.injectRequest({ method: "OPTIONS", headers: {}, url: serverURL });
		createNactTestingUtil(injectedResponse)
			.header("access-control-allow-origin", "localhost,127.0.0.1")
			.header("access-control-allow-methods", "GET,POST")
			.header("access-control-max-age", 1000)
			.length(0)
			.status(200)
			.done();
	});

	test("If origin is false then no headers set", () => {
		//@ts-ignore checking if allowed origin will be request origin
		server.useMiddleware(NactCors({ allowedOrigin: false }));
		const injectedResponse = server.injectRequest({ method: "GET", headers: {}, url: serverURL });

		createNactTestingUtil(injectedResponse)
			.header("access-control-allow-origin", undefined)
			.header("access-control-allow-credentials", undefined)
			.header("access-control-expose-headers", undefined)
			.done();
	});

	test("Set only non empty values from origin array", () => {
		server.useMiddleware(
			NactCors({
				allowedOrigin: ["     ", "localhost", "127.0.0.1", " "],
			})
		);
		const injectedResponse = server.injectRequest({ method: "GET", headers: {}, url: serverURL });

		createNactTestingUtil(injectedResponse).header("access-control-allow-origin", "localhost,127.0.0.1").done();
	});

	afterAll(() => {
		server.server.close();
	});
});
