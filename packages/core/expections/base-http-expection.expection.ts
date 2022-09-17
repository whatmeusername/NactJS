class HttpExpection extends Error {
	constructor(private readonly status: number, private readonly response?: string) {
		super();
		this.__setMessage();
	}

	protected __setMessage(): void {
		if (!this.response) {
			this.message = this.constructor.name;
		}
	}

	getMessage(): string {
		return this.message;
	}

	getStatus(): number {
		return this.status;
	}

	getBody() {
		return { status: this.status, message: this.message };
	}
}

export { HttpExpection };
