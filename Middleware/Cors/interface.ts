interface NactCorsSettings {
	allowedOrigin?: Array<string> | string | "*" | boolean;

	continuePreflight?: boolean;

	allowedHeaders?: Array<string>;
	exposedHeaders?: Array<string>;

	//declineHeaders?: Array<string>;

	allowedMethods?: Array<string>;
	maxAge?: number;
	withCredentials?: boolean;
}

export { NactCorsSettings };
