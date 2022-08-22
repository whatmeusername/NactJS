import { ROUTE__STATUS__CODE } from "../../nact-constants/index";

function HttpStatus(status: number): any {
	return function (
		target: () => any,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<any>
	): TypedPropertyDescriptor<any> {
		Reflect.defineMetadata(ROUTE__STATUS__CODE, status, descriptor);
		return descriptor;
	};
}

export { HttpStatus };
