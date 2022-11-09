import { NactServer } from "../../application";

import { MethodController } from "./test.service";
import { Reflector } from "../../Reflector";

let server: NactServer;
const createTestServer = () => {
	const app = new NactServer("nact-method_decorator-testing", { loggerEnabled: false });
	server = app;
	server.offline();
	return app;
};

server = createTestServer();

describe("nact method decorator testing", () => {
	afterAll(() => {
		server.clearModuleConfiguration();
	});

	beforeAll(async () => {
		await server.clearModuleConfiguration((key, tm) => {
			tm.useModule({
				controllers: [MethodController],
			});
		});
	});

	test("setMedata decorator on class method", async () => {
		const res = await server.injectRequest({
			url: "/method/metadata/",
			method: "GET",
		});

		const handlerMetaData = Reflector.get("meta", res?.getHandler());
		expect(handlerMetaData).toBeTruthy();
	});
});
