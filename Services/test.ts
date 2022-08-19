import Injectable from "./Inject/Injectable";
import Inject from "./Inject/Inject";
import "reflect-metadata";

@Injectable()
class TestService2 {
	hi: string;
	constructor() {
		this.hi = "hello";
	}

	sayHi() {
		// console.log(this.hi, " From TestService2");
	}
}

@Injectable()
class TestService3 {
	constructor(private test2: TestService2) {
		this.Test();
	}

	Test() {
		// console.log(this.test1);
		// console.log(this.test2);
	}
}

@Injectable()
class TestServiceModule1 {
	constructor() {
		this.Test();
	}

	Test() {
		// console.log(this.test1);
		// console.log(this.test2);
	}
}

@Injectable()
class TestServiceModule2 {
	constructor(private test1: TestServiceModule1, private test2: TestService3) {
		this.Test();
	}

	Test() {
		// console.log(this.test1);
		// console.log(this.test2);
	}
}

@Injectable()
class TestServiceModule3 {
	constructor(private test1: TestServiceModule1, private test2: TestService3, private test3: TestServiceModule2) {
		this.Test();
	}

	Test() {
		// console.log(this.test1);
		// console.log(this.test2);
	}
}

@Injectable()
class TestService {
	constructor(private test: TestService2, private test2: TestServiceModule2) {
		this.Test();
	}

	Test() {
		//console.log("Hello from TestService", this.test2);
	}
}

@Injectable()
class TestServiceModuleV1 {
	constructor(private test1: TestServiceModule3) {
		this.Test();
	}

	Test() {
		console.log(this.test1);
	}
}

export {
	TestService2,
	TestService,
	TestService3,
	TestServiceModule1,
	TestServiceModule2,
	TestServiceModule3,
	TestServiceModuleV1,
};
