import { Ip, Param, Query, Req, Get, Post } from "./packages/core/decorators";
import NactCors from "./packages/other/Middleware/Cors/middleware";
import { NactRequest } from "./packages/core/nact-request/index";
import { createModule } from "./packages/core/module/index";
import { createNactApp } from "./packages/core/application";

import { HttpExpection, HttpExpectionHandler, Controller, useHandler, Handler, Ctx, useGuard } from "./packages/core";

// temp
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import argon2 from "argon2";
import { NactGuard } from "./packages/core/guard";

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

function testGuard(): boolean {
	console.log("guard");
	return true;
}

class TestGuard extends NactGuard {
	validate(ctx: NactRequest): boolean {
		console.log("Hello");
		return true;
	}
}

@Controller()
@useGuard(TestGuard)
class ControllerTest {
	test: string;
	constructor() {
		this.test = "Hello world";
	}

	@Post("test")
	@Get("test")
	@useGuard(TestGuard)
	public async getTest(@Ctx ctx: NactRequest) {
		const authCookie = ctx.getRequest()?.cookies?.["authorized"];
		if (authCookie) {
			const data: { username: string; password: string } = jwt.decode(authCookie) as any;
			console.log(data.password);
			console.log(await argon2.verify(data.password, "123456admin"));
			console.log(await argon2.verify(data.password, "12345admin"));
		}
		const test = { username: "admin", password: await argon2.hash("12345admin") };

		const res = jwt.sign(test, process.env.JWT_SECRET ?? "");
		const verify = jwt.verify(res, process.env.JWT_SECRET ?? "");
		ctx.getResponse().cookie(ctx, "authorized", res, { httpOnly: true });
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
	const app = createNactApp();

	app.useMiddleware(NactCors({ allowedOrigin: "http://localhost:3000" }));
	app.useMiddleware(cookieParser(process.env.COOKIE_SECRET) as any, "express");

	app.listen(8000);
}

App();

//openssl rand -base64 172 | tr -d '\ n'
