import { Controller, Get, useHandler, useMiddleware, useGuard } from "../../decorators";
import { PageNotFoundException, InternalServerErrorExpection } from "../../expections/";
import { TestExpectionHandler, TestExpectionHandler2 } from "./handlers";

function ExpectionMiddleware() {
	throw new PageNotFoundException();
}

function ExpectionGuard(): boolean {
	if (true) {
		throw new PageNotFoundException();
	}
	return false;
}

@Controller("decorator")
class DecoratorExpections {
	@Get("middleware")
	@useMiddleware(ExpectionMiddleware)
	public middleware() {
		return true;
	}

	@Get("guard")
	@useGuard(ExpectionGuard)
	public guard() {
		return true;
	}
}

@Controller("expections")
class ExpectionController {
	@Get("standard")
	standardExpectionHandler() {
		throw new PageNotFoundException();
	}

	@Get("custom")
	@useHandler(TestExpectionHandler)
	customExpectionHandler() {
		throw new PageNotFoundException();
	}

	@Get("nothandled")
	@useHandler(TestExpectionHandler)
	shouldNotBeHandled() {
		throw new InternalServerErrorExpection();
	}
}

@Controller("expectionshandler")
@useHandler(TestExpectionHandler)
class ClassExpectationsHandler {
	@Get("handled")
	standardExpectionHandler() {
		throw new PageNotFoundException();
	}

	@Get("nothandled")
	shouldNotBeHandled() {
		throw new InternalServerErrorExpection();
	}

	@Get("method")
	@useHandler(TestExpectionHandler2)
	shouldBeHandledMethod() {
		throw new InternalServerErrorExpection();
	}
}

export { ExpectionController, ClassExpectationsHandler, DecoratorExpections };
