import type { HttpExpectionHandler } from "../../../expections";
import type { NactMiddlewareFunc, MiddlewareType, NactMiddleware } from "../../../middleware";

type WareGeneric =
	| ((...args: any[]) => any)
	| {
			new (...args: any[]): any;
	  }
	| { new (...args: any[]): HttpExpectionHandler }
	| HttpExpectionHandler;

type NactMiddlewareDecoratorArgument =
	| [NactMiddlewareFunc<MiddlewareType>, MiddlewareType]
	| NactMiddlewareFunc<MiddlewareType>
	| NactMiddleware
	| { new (): NactMiddleware };

export { WareGeneric, NactMiddlewareDecoratorArgument };
