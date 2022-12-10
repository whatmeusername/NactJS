import { Get, Controller, useGuard } from "../../decorators";
import { NactRequest } from "../../nact-request";
import { NactGuard } from "../../guard";

class TestGuard extends NactGuard {
	validate(ctx: NactRequest): boolean {
		if (ctx.getMethod() === "GET") {
			ctx.getResponse().status(401);
			return true;
		}
		return false;
	}
}

function TestGuard1(ctx: NactRequest): boolean {
	if (ctx.getMethod() === "GET") {
		ctx.getResponse().status(401);
		return true;
	}
	return false;
}

function TestGuard2(ctx: NactRequest): boolean {
	const status = ctx.getResponse().statusCode;
	if (status === 401) {
		ctx.getResponse().status(200);
		return true;
	}
	return false;
}

@Controller("guard")
class MethodGuardController {
	@Get("single")
	@useGuard(TestGuard1)
	public singleGuard() {
		return { data: "Hello world" };
	}

	@Get("multiple")
	@useGuard(TestGuard1, TestGuard2)
	public multipleGuard() {
		return { data: "Hello world" };
	}
}

@Controller("guardclass")
@useGuard(TestGuard1)
class ClassGuardController {
	@Get("single")
	empty() {
		return { data: "Hello world" };
	}
}

@Controller("guardclassusing")
class ClassGuardInstanceController {
	@Get("single")
	@useGuard(TestGuard)
	public empty() {
		return { data: "Hello world" };
	}

	@Get("usingnew")
	@useGuard(new TestGuard())
	public unew() {
		return { data: "Hello world" };
	}
}

export { MethodGuardController, ClassGuardController, ClassGuardInstanceController };
