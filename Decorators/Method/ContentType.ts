import { ROUTE__CONTENT__TYPE } from "../../router.const";

function ContentType(ContentType: string): any {
	return function (
		target: () => any,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<any>
	): TypedPropertyDescriptor<any> {
		Reflect.defineMetadata(ROUTE__CONTENT__TYPE, ContentType, descriptor);
		return descriptor;
	};
}

export default ContentType;
