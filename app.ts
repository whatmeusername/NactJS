import { Ip, Param, Query, Req, Get } from "./packages/core/decorators";
import NactCors from "./packages/other/Middleware/Cors/middleware";
import { NactRequest } from "./packages/core/nact-request/index";
import { createModule } from "./packages/core/module/index";
import { createNactApp } from "./packages/core/application";

import { Controller, Ctx } from "./packages/core";

// temp
import cookieParser from "cookie-parser";

@Controller()
class ControllerTest {
	test: string;
	constructor() {
		this.test = "Hello world";
	}

	@Get("123")
	public GetHello(): any {
		return { message: "Hello2" };
	}
}

@Controller("api")
class ApiController {
	@Get("delete?", ":hello(^hi2$)")
	Delete(@Param { hello }: any) {
		return { message: "Привет" };
	}

	@Get("/hello/hello?")
	HelloWorld2(@Param { id }: { id: string }) {
		return { message: "Hello world 2" };
	}

	@Get("/missing/:user?/found")
	missing2(@Param { user }: { user: string }) {
		return { data: user ? "success" : "fail" };
	}

	@Get("/")
	async HelloWorld(@Ctx ctx: NactRequest) {
		return { message: "Hello world" };
	}

	@Get("/:yes/hello/:id?")
	ByeWorldWithId(@Query() query: URLSearchParams, @Param { yes, id }: any, @Req req: NactRequest, @Ip ip: string) {
		return { test: "id" };
	}

	@Get("id?")
	TestId() {
		return { test: "id" };
	}
}

createModule({
	controllers: [ApiController],
});

function App() {
	const app = createNactApp();

	app.useMiddleware(NactCors({ allowedOrigin: "http://localhost:3000" }));
	app.useMiddleware(cookieParser(process.env.COOKIE_SECRET) as any, "express");

	app.listen(8000);
}

App();

//openssl rand -base64 172 | tr -d '\ n'
