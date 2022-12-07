import { Ip, Param, Query, Req, Get, Post } from "./packages/core/decorators";
import NactCors from "./packages/other/Middleware/Cors/middleware";
import { NactRequest } from "./packages/core/nact-request/index";
import { createModule } from "./packages/core/module/index";
import { createNactApp } from "./packages/core/application";

import {
	HttpExpection,
	HttpExpectionHandler,
	Controller,
	useHandler,
	Handler,
	Ctx,
	useMiddleware,
	NactIncomingMessage,
	NactServerResponse,
	Middleware,
	useGuard,
} from "./packages/core";

// temp
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import argon2 from "argon2";
import { NactGuard } from "./packages/core/guard";
import { NactMiddleware } from "./packages/core/middleware";

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

@Middleware("express")
class TestMiddleware extends NactMiddleware {
	use(req?: NactIncomingMessage, res?: NactServerResponse, next?: any): void {}
}

class TestGuard extends NactGuard {
	validate(ctx: NactRequest): boolean {
		console.log("Hello");
		return true;
	}
}

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
@useHandler(TestHandler)
class ApiController {
	@Get("delete?", ":hello(^hi2$)")
	Delete(@Param { hello }: any) {
		return { message: "Привет" };
	}

	@Get("/hello/:id(str)")
	HelloWorld2(@Param { id }: { id: string }) {
		return { message: "Hello world 2" };
	}

	@Get("/")
	HelloWorld(@Ctx ctx: NactRequest) {
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
	controllers: [ControllerTest, ApiController],
});

function App() {
	const app = createNactApp();

	app.useMiddleware(NactCors({ allowedOrigin: "http://localhost:3000" }));
	app.useMiddleware(cookieParser(process.env.COOKIE_SECRET) as any, "express");

	app.listen(8000);
}

App();

//openssl rand -base64 172 | tr -d '\ n'
