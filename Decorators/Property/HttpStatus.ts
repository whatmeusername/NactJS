import { ROUTE__STATUS__CODE } from '../../router.const';

function HttpStatus(status: number): any {
    return function (
        target: Function,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<any>
    ): TypedPropertyDescriptor<any> {
        Reflect.defineMetadata(ROUTE__STATUS__CODE, status, descriptor);
        return descriptor;
    };
}

export default HttpStatus;
