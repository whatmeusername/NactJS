import type { NactConfigItem, NactConfigItemMiddleWare } from "../routing";
import type { MiddlewareType, NactMiddlewareFunc, NactMiddlewareObject } from "../middleware";
import type { NactRequest } from "../nact-request";
import type { NactGuard, NactGuardFunc } from "../guard";

function runMiddlewares(
	middlewares: (NactMiddlewareObject<MiddlewareType> | NactConfigItemMiddleWare)[],
	NactRequest: NactRequest,
): boolean {
	function next(value: string): void {
		if (value === "route") {
			end = true;
		} else if (typeof value === "string") {
			// TODO: THROW NACT ERRORS;
			throw new Error(value);
		}
	}

	let end = false;

	for (let i = 0; i < middlewares.length; i++) {
		if (end) break;
		if (!NactRequest.isSended()) {
			const data = middlewares[i];

			let middleware = (data as any)?.middleware ? (data as any).middleware : (data as any).instance;
			if (middleware?.use) middleware = middleware.use;

			let params: any[] = [];

			if (!data?.type || data?.type === "nact") {
				params = [NactRequest];
			} else {
				params = [NactRequest.getRequest(), NactRequest.getResponse(), next];
				(middleware as NactMiddlewareFunc)(NactRequest.getRequest(), NactRequest.getResponse(), next);
			}
			(middleware as any)?.use
				? (middleware as any).use(...params)
				: //@ts-ignore
				  (middleware as NactMiddlewareFunc)(...params);
		} else return false;
	}
	return true;
}

function runGuards(guards: (NactGuardFunc | NactConfigItem)[], NactRequest: NactRequest): boolean {
	let res = true;
	for (let i = 0; i < guards.length; i++) {
		const guard = ((guards[i] as any)?.instance as NactGuard) ?? (guards[i] as NactGuardFunc);
		res = (guard as any)?.validate ? (guard as NactGuard).validate(NactRequest) : (guard as any)(NactRequest);
	}
	return res;
}

export { runMiddlewares, runGuards };
