import { Injectable, Inject } from "../../Decorators/Inject/index";
import { isInitializedClass } from "../../Module/index";

@Injectable()
class ServiceEmpty {
	constructor() {}

	getValue(): boolean {
		return true;
	}
}

@Injectable()
class AnotherEmptyService {
	constructor() {}

	getValue(): boolean {
		return true;
	}
}

@Injectable()
class ServiceA {
	constructor(private S1: ServiceEmpty) {}

	getValue(): boolean {
		return this.S1?.getValue() ?? false;
	}
}

@Injectable()
class ServiceB {
	constructor(private S1: ServiceEmpty, private S2: ServiceA) {}

	getValue(): boolean {
		return (this.S1?.getValue() && this.S2?.getValue()) ?? false;
	}
}

@Injectable()
class ServiceC {
	constructor(private S1: ServiceEmpty, private S2: ServiceA, private S3: ServiceB) {}

	getValue(): boolean {
		return (this.S1?.getValue() && this.S2?.getValue(), this.S3?.getValue()) ?? false;
	}
}

@Injectable()
class ServiceINJ {
	constructor(@Inject("PASS_TEST") private value: boolean) {}

	getValue(): boolean {
		return this.value;
	}
}

@Injectable()
class ServiceAlias {
	constructor(@Inject("AnotherEmptyService") private value: boolean) {}

	getValue(): boolean {
		return isInitializedClass(this.value);
	}
}

export { AnotherEmptyService, ServiceEmpty, ServiceA, ServiceB, ServiceC, ServiceINJ, ServiceAlias };
