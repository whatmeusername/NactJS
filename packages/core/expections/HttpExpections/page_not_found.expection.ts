import { HttpExpection } from "../base-http-expection.expection";

class PageNotFoundException extends HttpExpection {
	constructor() {
		super(404, "Page not found");
	}
}

export { PageNotFoundException };
