import { HttpExpectionHandler, PageNotFoundException, InternalServerErrorExpection } from "../../expections";
import { Handler } from "../../decorators";
import type { NactRequest } from "../../nact-request";

@Handler(PageNotFoundException)
class TestExpectionHandler extends HttpExpectionHandler {
	catch(expection: PageNotFoundException, ctx: NactRequest) {
		const res = ctx.getResponse();

		res.json({
			...expection.getBody(),
			someValue: true,
			statusCode: 200,
		});
	}
}

@Handler(InternalServerErrorExpection)
class TestExpectionHandler2 extends HttpExpectionHandler {
	catch(expection: PageNotFoundException, ctx: NactRequest) {
		const res = ctx.getResponse();

		res.json({
			...expection.getBody(),
			someValue: false,
			statusCode: 200,
		});
	}
}

export { TestExpectionHandler, TestExpectionHandler2 };
