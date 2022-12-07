import type { NactIncomingMessage, NactRequest, NactServerResponse } from "../nact-request";

type MiddlewareType = "nact" | "express" | "fastify";

type NactMiddlewareFunc<T extends void | MiddlewareType = void> = T extends "nact"
	? (req: NactRequest) => void
	: (req: NactIncomingMessage, res: NactServerResponse, next: any) => void;

type NactMiddlewareObject<T extends MiddlewareType> = { middleware: NactMiddlewareFunc<T>; type: T };

export { NactMiddlewareObject, MiddlewareType, NactMiddlewareFunc };
