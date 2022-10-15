import { Controller, Get, useHandler } from "../../decorators";
import { PageNotFoundException, InternalServerErrorExpection } from "../../expections/";
import { TestExpectionHandler, TestExpectionHandler2 } from "./handlers";

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

export { ExpectionController, ClassExpectationsHandler };
