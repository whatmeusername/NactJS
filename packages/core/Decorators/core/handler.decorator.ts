import { HttpExpection } from "../../expections/base-http-expection.expection";
import { HANDLER__ALLOWED__EXPECTIONS } from "../../nact-constants/router.const";
import { setMetadata } from "./set-metadata.decorator";

function Handler(...handlers: ({ new (status: number, message: string): HttpExpection } | HttpExpection | string)[]) {
	return setMetadata(HANDLER__ALLOWED__EXPECTIONS, handlers ?? []);
}

export { Handler };
