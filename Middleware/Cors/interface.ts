interface NactCorsSettings {
    allowedOrigin?: Array<string> | string | '*';

    continuePreflight?: boolean;

    allowedHeaders?: Array<string>;
    exposedHeaders?: Array<string>;

    //declineHeaders?: Array<string>;

    allowedMethods?: Array<string>;
    maxAge?: number;
    withCredentials?: boolean;
}

export { NactCorsSettings };
