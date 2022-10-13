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

export type { InjectRequest, serverSettings };
