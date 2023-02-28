import { IncomingMessage } from "http";

import type { Socket } from "net";
import type { NactRequest } from "./ctx";

class NactIncomingMessage extends IncomingMessage {
	protected body: any;
	private ctx?: NactRequest | undefined;

	public secret: string | undefined | null;
	public cookies: { [K: string]: string } | undefined | null;
	public signedCookies: { [K: string]: string } | undefined | null;

	constructor(socket: Socket) {
		super(socket);

		this.body = undefined;
		this.ctx = undefined;

		this.on("data", (chunk: Buffer) => {
			if (chunk instanceof Buffer) {
				this.body = chunk.toString();
			} else {
				this.body = chunk;
			}
		});
	}

	set __ctx(ctx: NactRequest) {
		if (!this.ctx) {
			this.ctx = ctx;
		}
	}

	public getBody(): any {
		return this.body;
	}

	public getHeader(name: string): string | string[] | null {
		return this.headers[name] ?? null;
	}
}

export { NactIncomingMessage };
