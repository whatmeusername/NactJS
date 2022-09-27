import { Ip, Param, Query, Req, Get } from "./packages/core/Decorators";
import NactCors from "./packages/other/Middleware/Cors/middleware";
import { NactRequest } from "./packages/core/nact-request/index";
import { createModule, createProvider } from "./packages/core/Module/index";

import {
	TestService,
	TestService3,
	TestServiceModule1,
	TestServiceModule2,
	TestServiceModule3,
	TestServiceModuleV1,
} from "./TemperaryFolder/TestServices";
import { Controller, useHandler, Handler } from "./packages/core/";
import { NactServer, HttpExpection, HttpExpectionHandler } from "./packages/core";

class TestHttpExpection extends HttpExpection {
	constructor() {
		super(501, "got error");
	}
}

@Handler(TestHttpExpection)
class TestHandler extends HttpExpectionHandler {
	catch(expection: HttpExpection, ctx: NactRequest) {
		const response = ctx.getResponse();
		response.json(expection.getBody());
	}
}

@Controller("api")
@useHandler(TestHandler)
class ApiController {
	constructor(private SomeTrashService: TestService3) {}

	@Get("delete?", ":hello(^hi2$)")
	Delete(@Param { hello }: any) {
		return { message: "bye" };
	}

	@Get("/hello/:id(num)?")
	@useHandler(TestHandler)
	async HelloWorld1(@Param { id }: { id: string }) {
		const promise = new Promise((resolve) => {
			throw new TestHttpExpection();
			setTimeout(() => {
				resolve({ message: "Hello world 1" });
			}, 100);
		});
		return await promise;
	}

	@Get("/hello/:id(str)")
	HelloWorld2() {
		return { message: "Hello world 2" };
	}

	@Get("/")
	HelloWorld() {
		return { message: "Hello world" };
	}

	@Get("/:yes/hello/:id?")
	ByeWorldWithId(@Query query: URLSearchParams, @Param { yes, id }: any, @Req req: NactRequest, @Ip ip: string) {
		return { test: "id" };
	}

	onInstanceReady() {
		console.log("yes");
	}
}

createModule({
	controllers: [ApiController],
	providers: [
		createProvider({
			providerName: "test",
			useFactory: () => {
				return "test";
			},
		}),
		TestService3,
	],
});

function App() {
	const app = new NactServer();

	app.useMiddleware(NactCors({ allowedOrigin: "http://localhost:3000" }));

	app.listen(8000);
}

App();
