import { HttpExpection } from "../../expections/base-http-expection.expection";
import { HANDLER__ALLOWED__EXPECTIONS } from "../../nact-constants/router.const";
import { setMetadata } from "./set-metadata.decorator";

const Handler = (
	...handlers: ({ new (status: number, message: string): HttpExpection } | HttpExpection | string)[]
): any => setMetadata(HANDLER__ALLOWED__EXPECTIONS, handlers ?? []);

export { Handler };
