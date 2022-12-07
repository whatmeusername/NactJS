import { MiddlewareType } from "../../../middleware";
import { MIDDLEWARE_DECORATOR_TYPE, MIDDLEWARE_VAR_NAME } from "../../../nact-constants";
import { setMetadata } from "../set-metadata.decorator";
import { createWareDecorator } from "./global";
import type { NactMiddlewareDecoratorArgument } from "./interface";

const useMiddleware = createWareDecorator<NactMiddlewareDecoratorArgument>(MIDDLEWARE_VAR_NAME);

function Middleware(type?: MiddlewareType) {
	return setMetadata(MIDDLEWARE_DECORATOR_TYPE, type ?? "nact");
}

export { useMiddleware, Middleware };
