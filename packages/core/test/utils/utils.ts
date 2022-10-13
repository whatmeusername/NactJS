import type { NactServer } from "../../application";
import type { ProviderData } from "../../module";
import type { NactRequest } from "../../nact-request";
import type { ServiceInstanceOrName } from "./interface";

import { isInitializedClass } from "../../shared";

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

function ErrorStringIsNactError(string: string): boolean {
	return string.includes("NACT ERROR");
}

function getValueFromTestInstance(
	server: NactServer,
	service: ServiceInstanceOrName[] | ServiceInstanceOrName,
): boolean {
	const services = Array.isArray(service) ? service : [service];
	const transferModule = server.getTransferModule();

	let result = false;
	for (let i = 0; i < services.length; i++) {
		const service = services[i];
		const provider = transferModule.getProviderFromLocationByName(service);
		if (provider && provider?.resolved) {
			const instance = provider?.instance;

			if (isInitializedClass(instance)) {
				result = instance.getValue() ?? false;
			} else {
				result = instance === true;
			}
			if (!result) break;
		}
	}
	return result;
}

function getProviderFromTransfer(
	server: NactServer,
	service: ServiceInstanceOrName | ServiceInstanceOrName,
): ProviderData {
	const transferModule = server.getTransferModule();
	return transferModule.getProviderFromLocationByName(service);
}

export { NactResponseTestingUtil, ErrorStringIsNactError, getValueFromTestInstance, getProviderFromTransfer };
