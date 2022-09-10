import { Controller } from "../../../../app";
import { Get, Param } from "../../Decorators/index";

@Controller()
class BaseController1 {
	@Get("/test/")
	method1() {
		return { data: "method1" };
	}

	@Get("/test/")
	method2() {
		return { data: "method2" };
	}

	@Get("/test/2")
	method3() {
		return { data: "method3" };
	}

	@Get("/test/:id")
	method4() {
		return { data: "method4" };
	}

	@Get("/test/")
	method5() {
		return { data: "method5" };
	}

	@Get("/test/")
	method6() {
		return { data: "method6" };
	}
}

export { BaseController1 };
