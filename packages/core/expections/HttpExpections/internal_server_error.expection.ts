import { HttpExpection } from "../base-http-expection.expection";

class InternalServerErrorExpection extends HttpExpection {
	constructor() {
		super(500, "Internal server error");
	}
}

export { InternalServerErrorExpection };
