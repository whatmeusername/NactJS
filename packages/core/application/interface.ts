interface InjectRequest {
	url: string;
	headers?: { [K: string]: string };
	method: "GET" | "POST" | "DELETE" | "OPTIONS" | "PUT";
	body?: any;
	authority?: string;
}

interface serverSettings {
	loggerEnabled?: boolean;
}

type NactListernerEvent = "close" | "start";

export type { InjectRequest, serverSettings, NactListernerEvent };
