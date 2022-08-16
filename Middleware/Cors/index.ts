import type NactRequest from "../../request";
import { isString, isDefined } from "../../utils/Other";
import { NactCorsSettings } from "./interface";

const NactCorsDefaultSettings = {
	allowedOrigin: "*",
	continuePreflight: false,
};

function NactCors(corsSettings: NactCorsSettings = NactCorsDefaultSettings): (request: NactRequest) => void {
	function isOriginAllowed(request: NactRequest): boolean {
		const requestOrigin = request.origin;
		const corsAllowedOrigin = corsSettings.allowedOrigin ?? "*";

		if (isString(corsAllowedOrigin)) {
			if (corsAllowedOrigin === "*") return true;
			else return corsAllowedOrigin === requestOrigin;
		} else if (Array.isArray(corsAllowedOrigin)) {
			for (let i = 0; i < corsAllowedOrigin.length; i++) {
				const currentCorsOrigin = corsAllowedOrigin[i];
				if (currentCorsOrigin === requestOrigin) return true;
			}
			return false;
		}
		return false;
	}
	function setCorsOrigins(request: NactRequest) {
		let corsAllowedOrigin = corsSettings.allowedOrigin;
		const requestOrigin = request.origin;

		if (corsAllowedOrigin === "*") {
			request.header("Access-Control-Allow-Origin", "*");
		} else if (isString(corsAllowedOrigin)) {
			request.header("Access-Control-Allow-Origin", corsAllowedOrigin as string);
			request.header("Vary", "Origin");
		} else if (Array.isArray(corsAllowedOrigin)) {
			if (corsAllowedOrigin.length > 0) {
				corsAllowedOrigin = corsAllowedOrigin.filter((value) => {
					return isDefined(value);
				});

				request.header("Access-Control-Allow-Origin", corsAllowedOrigin);
				request.header("Vary", "Origin");
			}
		} else {
			const isAllowed = isOriginAllowed(request);
			request.header("Access-Control-Allow-Origin", isAllowed ? requestOrigin : false);
			request.header("Vary", "Origin");
		}
	}

	function setMethods(request: NactRequest) {
		const allowedMethods = corsSettings.allowedMethods ?? [];
		if (allowedMethods.length > 0) {
			request.header("Access-Control-Allow-Methods", allowedMethods);
		}
	}

	function setCredentials(request: NactRequest) {
		if (corsSettings.withCredentials) {
			request.header("Access-Control-Allow-Credentials", true);
		}
	}

	function setAllowedHeaders(request: NactRequest) {
		let allowedHeaders: string[] | string = corsSettings.allowedHeaders ?? [];

		if (allowedHeaders.length === 0) {
			allowedHeaders = request.getHeader("access-control-request-headers") ?? [];
			request.header("Vary", "Access-Control-Request-Headers");
		}
		if (allowedHeaders && allowedHeaders.length > 0) {
			request.header("Access-Control-Allow-Headers", allowedHeaders);
		}
	}

	function setExposedHeaders(request: NactRequest) {
		const exposedHeaders = corsSettings.exposedHeaders;
		if (exposedHeaders) {
			request.header("Access-Control-Expose-Headers", exposedHeaders);
		}
	}

	function setMaxAge(request: NactRequest) {
		const maxAge = corsSettings.maxAge;
		if (maxAge !== undefined) {
			request.header("Access-Control-Max-Age", maxAge);
		}
	}

	return function Cors(request: NactRequest) {
		const requestMethod = request.method;

		if (corsSettings.allowedOrigin === false) return;

		if (requestMethod === "OPTIONS") {
			setCorsOrigins(request);
			setCredentials(request);
			setMethods(request);
			setAllowedHeaders(request);
			setMaxAge(request);
			setExposedHeaders(request);
			if (!corsSettings.continuePreflight) {
				request.status(200).length(0).end();
			}
		} else {
			setCorsOrigins(request);
			setCredentials(request);
			setExposedHeaders(request);
		}
	};
}

export default NactCors;
export { NactCorsSettings, NactCorsDefaultSettings };
