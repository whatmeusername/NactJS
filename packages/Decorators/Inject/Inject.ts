function Inject(target: any, propKey: string): any {
	const propType = Reflect.getMetadata("design:type", target, propKey);
}

export default Inject;
