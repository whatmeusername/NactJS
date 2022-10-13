import { Get, Param, Body, Req, Query, Controller, Post, setMetadata } from "../../decorators";
import { NactIncomingMessage } from "../../nact-request";

// Ip decator its not test due tests are running on offline server;

@Controller("params")
class ParamsController {
	@Get(":param")
	methodWithParam(@Param { param }: { param: string }): { data: boolean } {
		return { data: param === "param" };
	}

	@Get(":id/:name/:test")
	methodWithParams(@Param { id, name, test }: { id: string; name: string; test: string }): { data: boolean } {
		return { data: id !== undefined && name !== undefined && test !== undefined };
	}

	@Get(":id/name/:test")
	methodWithStatic(@Param { id, name, test }: { id: string; name: string; test: string }): { data: boolean } {
		return { data: id !== undefined && name === undefined && test !== undefined };
	}

	@Get("reguest")
	methodWithReq(@Req req: NactIncomingMessage): { data: boolean } {
		return { data: req instanceof NactIncomingMessage };
	}

	@Get("query")
	methodWithQuery(@Query query: URLSearchParams): { data: boolean } {
		return { data: query.get("somevalue") === "true" };
	}

	@Get("query2")
	methodWithQuery2(@Query query: URLSearchParams): { data: boolean } {
		return { data: query.get("somevalue") === "true" && query.get("new") === "false" };
	}

	@Post("body")
	methodWithBody(@Body body: any): { data: boolean } {
		return { data: body !== undefined && body.value === "true" };
	}
}

@Controller("method")
class MethodController {
	@Get("metadata")
	@setMetadata("meta", true)
	metadataDecorator(): { data: boolean } {
		return { data: true };
	}
}

export { ParamsController, MethodController };
