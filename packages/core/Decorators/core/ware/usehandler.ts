import type { HttpExpectionHandler } from "../../../expections/index";
import { HANDLER_VAR_NAME } from "../../../nact-constants/";
import { createWareDecorator } from "./global";
import { HttpExpection } from "../../../expections/base-http-expection.expection";
import { HANDLER__ALLOWED__EXPECTIONS } from "../../../nact-constants/router.const";
import { setMetadata } from "../set-metadata.decorator";

const useHandler = createWareDecorator<{ new (...arg: any[]): HttpExpectionHandler } | HttpExpectionHandler>(
	HANDLER_VAR_NAME,
);

function Handler(
	...handlers: ({ new (status: number, message: string): HttpExpection } | HttpExpection | string)[]
): ReturnType<typeof setMetadata> {
	return setMetadata(HANDLER__ALLOWED__EXPECTIONS, handlers ?? []);
}

export { Handler, useHandler };
