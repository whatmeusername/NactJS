import { PROPERTY_DEPENDENCIES } from "../../nact-constants/index";

function createPropertyDecorator(func: (...args: any[]) => void): any {
	return function (target: any, key: string, index: any): any {
		func(target, key, index);
	};
}

const Inject = (token: string): any =>
	createPropertyDecorator((target: any, key: string, index: any) => {
		const propToken = token || Reflect.getMetadata("design:type", target, key);

		if (propToken) {
			const dependencies = Reflect.getMetadata(PROPERTY_DEPENDENCIES, target) ?? [];
			Reflect.defineMetadata(
				PROPERTY_DEPENDENCIES,
				[...dependencies, { index: index, name: propToken, type: "inject" }],
				target
			);
		}
	});

export { Inject };
