import type { HTTPMethods } from "../routing";

interface InjectRequest {
	url: string;
	headers?: { [K: string]: string };
	method: HTTPMethods;
	body?: any;
	authority?: string;
}

interface serverSettings {
	loggerEnabled?: boolean;
}

enum NactListernerEvent {
	CLOSE = "close",
	START = "start",
}

enum NactWareExectionDirection {
	BEFORE = "before",
	AFTER = "after",
}

export { NactListernerEvent, NactWareExectionDirection };
export type { InjectRequest, serverSettings };
