import { Get, Controller, useMiddleware, Middleware } from "../../decorators";
import { NactIncomingMessage, NactRequest, NactServerResponse } from "../../nact-request";
import { NactMiddleware } from "../../middleware";

@Middleware("express")
class TestMiddleware extends NactMiddleware {
	use(req?: NactIncomingMessage, res?: NactServerResponse, next?: any): void {
		res?.status(401);
	}
}

function NactTestMiddleware(ctx: NactRequest): void {
	ctx.getResponse().status(401);
}

function ExpressTestMiddleware(reg: NactIncomingMessage, res: NactServerResponse, next: any): void {
	res.status(next !== undefined ? 500 : 401);
}

function NactTestMiddleware1(ctx: NactRequest): void {
	ctx.getResponse().status(404);
}

function NactTestMiddleware2(ctx: NactRequest): void {
	const res = ctx.getResponse();
	res.status(res.statusCode === 404 ? 401 : 500);
}

function GlobalNactMiddleware2(ctx: NactRequest): void {
	ctx.getResponse().status(401);
}

@Controller("middleware")
class MiddlewareController {
	@Get("classinstance")
	@useMiddleware(TestMiddleware)
	public uclass() {
		return true;
	}

	@Get("withoutmiddleware")
	public Empty() {
		return true;
	}

	@Get("methodstandard")
	@useMiddleware(NactTestMiddleware)
	public FunctionMiddleware() {
		return true;
	}

	@Get("methodexpress")
	@useMiddleware([ExpressTestMiddleware, "express"])
	public FunctionExpressMiddleware() {
		return true;
	}

	@Get("multiple")
	@useMiddleware([NactTestMiddleware1, "nact"], [NactTestMiddleware2, "nact"])
	public FunctionMultipleTest() {
		return true;
	}
}

@Controller("middlewareclass1")
@useMiddleware([ExpressTestMiddleware, "express"])
class MiddlewareClass1Controller {
	@Get("methodexpress")
	public FunctionMiddleware() {
		return true;
	}
}

@Controller("middlewareclass2")
@useMiddleware([NactTestMiddleware1, "nact"], [NactTestMiddleware2, "nact"])
class MiddlewareClass2Controller {
	@Get("multiple")
	public FunctionMiddleware() {
		return true;
	}
}

@Controller("middlewareclass3")
@useMiddleware(NactTestMiddleware)
class MiddlewareClass3Controller {
	@Get("methodstandard")
	public FunctionMiddleware() {
		return true;
	}
}

@Controller("middlewareclass4")
@useMiddleware(TestMiddleware)
class MiddlewareClass4Controller {
	@Get("standard")
	public FunctionMiddleware() {
		return true;
	}
}

export {
	MiddlewareController,
	MiddlewareClass1Controller,
	MiddlewareClass2Controller,
	MiddlewareClass3Controller,
	MiddlewareClass4Controller,
	GlobalNactMiddleware2,
};
