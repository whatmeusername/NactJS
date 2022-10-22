import { Ip, Param, Query, Req, Get } from "./packages/core/decorators";
import NactCors from "./packages/other/Middleware/Cors/middleware";
import { NactRequest } from "./packages/core/nact-request/index";
import { createModule } from "./packages/core/module/index";

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
	}
}

@Controller()
class ControllerTest {
	test: string;
	constructor() {
		this.test = "Hello world";
	}

	@Get("test")
	public getTest() {
		return { message: this.test };
	}
	@Get("123")
	public GetHello(): any {
		return { message: "Hello2" };
	}
}

@Controller("api")
@useHandler(TestHandler)
class ApiController {
	@Get("delete?", ":hello(^hi2$)")
	Delete(@Param { hello }: any) {
		return { message: "Привет" };
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
	HelloWorld2(@Param { id }: { id: string }) {
		return { message: "Hello world 2" };
	}

	@Get("/")
	HelloWorld() {
		return { message: "Hello world" };
	}

	@Get("/:yes/hello/:id?")
	ByeWorldWithId(@Query() query: URLSearchParams, @Param { yes, id }: any, @Req req: NactRequest, @Ip ip: string) {
		return { test: "id" };
	}
}

createModule({
	controllers: [ControllerTest, ApiController],
});

function App() {
	const app = new NactServer();

	app.useMiddleware(NactCors({ allowedOrigin: "http://localhost:3000" }));

	app.listen(8000);
}

App();
