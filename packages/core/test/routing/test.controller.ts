import { Get, Post, Param, Controller } from "../../Decorators/";

@Controller()
class BaseController1 {
	@Get("/unique/")
	unique() {
		return { data: "method1" };
	}

	@Get("/repeats/")
	repeats1() {
		return { data: "method2" };
	}
	@Get("/repeats/")
	repeats2() {
		return { data: "method3" };
	}

	@Get("/test/2")
	testStatic() {
		return { data: "method4" };
	}

	@Get("/test/:id")
	methodWithParam(@Param { id }: { id: string }) {
		return { data: id };
	}

	@Get("/complex/:id/something/:name")
	complexMethod(@Param params: { id: string; name: string }) {
		return { data: params };
	}

	@Get("/complex1/:number/something/:username")
	complexMethodSame1(@Param params: { number: string; username: string }) {
		return { data: params };
	}

	@Get("/complex1/:id/something/:another")
	complexMethodSame2(@Param params: { id: string; another: string }) {
		return { data: params };
	}

	@Get("/missing/hello/:bye")
	missing() {
		return { data: "missing" };
	}
}

@Controller("optional")
class OptionalController {
	@Get("/user?")
	staticOptional1() {
		return { data: "optional" };
	}

	@Get("/admin?")
	nonOptional1() {
		return { data: "adminOptional" };
	}

	@Get("/admin")
	Optional2() {
		return { data: "nonOptional" };
	}

	@Get("/login/:user?")
	Optional3(@Param { user }: { user: string }) {
		return { data: user !== undefined };
	}

	@Get("/look/:page?/start/")
	OptionalOn() {
		return { data: "page" };
	}

	@Get("/register/:user?")
	repeatOptiona1(@Param { user }: { user: string }) {
		return { data: user ? "someuser1" : "someuser2" };
	}

	@Get("/register/:user?")
	repeatOptiona2(@Param { user }: { user: string }) {
		return { data: user ? "someuser3" : "someuser4" };
	}

	@Get("/logout/:id?/user/:name?")
	complex1(@Param { id, name }: { id: string; name: string }) {
		return { data: id && name ? "success" : "fail" };
	}

	@Get("/exit/:id?/user/:name?")
	complex2(@Param { id, name }: { id: string; name: string }) {
		return { data: id && name ? "success1" : "fail1" };
	}

	@Get("/exit/:id?/user/:name?")
	complex3(@Param { id, name }: { id: string; name: string }) {
		return { data: id && name ? "success2" : "fail2" };
	}

	@Get("/missing/:user?/found")
	missing2(@Param { user }: { user: string }) {
		return { data: user ? "success" : "fail" };
	}
	@Get("/missing/username/:user?")
	missingOnEnd(@Param { user }: { user: string }) {
		return { data: user ? "success" : "fail" };
	}
}

@Controller("regex")
class RegexContorller {
	@Get("user/:id(num)")
	idNumber(@Param { id }: { id: string }) {
		return { data: id ? "num" : "??" };
	}
	@Get("user/:id(str)")
	idString(@Param { id }: { id: string }) {
		return { data: id ? "str" : "??" };
	}
	@Get("user/:id(^some\\d+num$)?")
	ownPattern(@Param { id }: { id: string }) {
		return { data: id ? "own" : "??" };
	}

	@Get("admin/:id(str)/:user?")
	combine(@Param { id, user }: { id: string; user: string }) {
		return { data: id && user ? "combine" : "huh" };
	}

	@Get("complex/:id(str)/:user(str)/:pass(num)")
	complex(@Param { id, user, pass }: { id: string; user: string; pass: number }) {
		return { data: id && user && pass ? "complex" : "fail" };
	}

	@Get(/^test\d+$/)
	clearedRegex() {
		return { data: "cleared" };
	}

	@Get("(^bracket\\d+$)")
	clearedBrackets() {
		return { data: "bracket" };
	}
}

@Controller("paths")
class MultiPathsController {
	@Get("hello", "delete")
	staticMethod() {
		return { data: "static" };
	}

	@Get("param/:param", "param/:param/:param2")
	parameterMethod(@Param { param, param2 }: { param: string; param2: string }) {
		return { data: param && param2 ? "params" : "param" };
	}
}

@Controller("methods")
class MultiMethodsController {
	@Get("hello", "delete")
	@Post("hello")
	staticMethod() {
		return { data: "static" };
	}

	@Get("param/:param", "param/:param/:param2")
	@Post("param/:param/:param2")
	parameterMethod(@Param { param, param2 }: { param: string; param2: string }) {
		return { data: param && param2 ? "params" : "param" };
	}
}

export { BaseController1, OptionalController, RegexContorller, MultiPathsController, MultiMethodsController };
