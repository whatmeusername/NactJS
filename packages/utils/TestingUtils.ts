import { NactRequest } from "../core/nact-request/index";

expect.extend({
	toEqualMessage(received, expected, custom) {
		let pass = true;
		let message = "";
		try {
			expect(received).toEqual(expected);
		} catch (e) {
			pass = false;
			message = `${e}\nTest failed while: ${custom}`;
		}
		return {
			pass,
			message: () => message,
			expected,
			received,
		};
	},
});

class NactResponseTestingUtil {
	protected NactRequest: NactRequest;
	protected passing: boolean;
	protected fallenAt: string;
	constructor(NactRequest: NactRequest | undefined) {
		this.NactRequest = NactRequest as NactRequest;
		this.passing = true;
		this.fallenAt = "";

		if (!this.NactRequest) {
			this.passing = false;
			this.done();
		}
	}

	method(method: "GET" | "POST" | "DELETE" | "OPTIONS" | "PUT"): NactResponseTestingUtil {
		if (this.passing) {
			const reqMethod = this.NactRequest.getMethod();
			if (reqMethod !== method) this.passing = false;
		}
		return this;
	}
	status(status: number): NactResponseTestingUtil {
		if (this.passing) {
			const responseStatusCode = this.NactRequest.getResponse().statusCode;
			if (responseStatusCode !== status) {
				this.passing = false;
				this.fallenAt = `Test failed at checking status code: expected status code ${status}, but got ${responseStatusCode}`;
			}
		}
		return this;
	}

	length(length: number): NactResponseTestingUtil {
		if (this.passing) {
			//@ts-ignore accessing to protected property
			const responseContentType = this.NactRequest.response.getHeader("Content-Length");
			if (responseContentType !== length) {
				this.passing = false;
				this.fallenAt = `Test failed at checking "Content-length" header: expected length ${length}, but got ${responseContentType}`;
			}
		}
		return this;
	}

	header(Header: string, value: string | number | undefined | null): NactResponseTestingUtil {
		if (this.passing) {
			let header = this.NactRequest.getResponse().getHeader(Header);
			if (Array.isArray(header)) header = header.join(",").trim();

			if ((header === undefined && header !== value) || (header && header !== value)) {
				this.passing = false;
				this.fallenAt = `Test failed at checking header value: expected header value ${value} , but got ${header}`;
			}
		}
		return this;
	}

	done() {
		//@ts-ignore
		expect(this.passing).toEqualMessage(true, this.fallenAt);
	}
}

export { NactResponseTestingUtil };
