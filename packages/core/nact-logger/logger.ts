const colors = {
	Reset: "\x1b[0m",
	Bright: "\x1b[1m",
	Dim: "\x1b[2m",
	Underscore: "\x1b[4m",
	Blink: "\x1b[5m",
	Reverse: "\x1b[7m",
	Hidden: "\x1b[8m",

	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
};

type LoggerAvailableColors = keyof typeof colors;

interface LoggerSettings {
	isEnable: boolean;
}

let logger: NactLogger | null = null;
function createSharedNactLogger(settings: LoggerSettings) {
	logger = new NactLogger(settings);
	return logger;
}

function getNactLogger(): NactLogger {
	if (logger === null) {
		logger = new NactLogger();
	}
	return logger as NactLogger;
}

class NactLogger {
	private logColor: LoggerAvailableColors;
	private warningColor: LoggerAvailableColors;
	private errorColor: LoggerAvailableColors;
	private infoColor: LoggerAvailableColors;
	private isEnable: boolean;

	constructor(settings?: LoggerSettings) {
		this.logColor = colors.green as LoggerAvailableColors;
		this.warningColor = colors.yellow as LoggerAvailableColors;
		this.errorColor = colors.red as LoggerAvailableColors;
		this.infoColor = colors.blue as LoggerAvailableColors;
		this.isEnable = settings?.isEnable ?? true;
	}

	protected __color(color: string, message: string, type?: "warning" | "error" | "info"): void {
		if (this.isEnable) {
			if (type) {
				if (type === "warning") console.warn(color, message, colors.Reset);
				else if (type === "error") console.error(color, message, colors.Reset);
				else if (type === "info") console.info(color, message, colors.Reset);
			} else console.log(color, message, colors.Reset);
		}
	}

	getTime(inheritColor: string, useColor = false): any {
		const date = new Date().toLocaleTimeString("en-GB", { day: "numeric", month: "short" });
		return `${useColor ? "" : colors.black} ${date} ${useColor ? "" : inheritColor}`;
	}

	log(message: string): void {
		const prefix = "[NACT LOG]";
		const color = `${this.logColor}`;

		const startsWith = [this.getTime(color), prefix].join(" ");
		this.__color(color, `${startsWith} ${message}`);
	}

	error(message: string): Error {
		const prefix = "[NACT ERROR]";
		const color = `${this.errorColor}`;
		const startsWith = [this.getTime(color), prefix].join(" ");

		const errorMessage = `${color}${startsWith} ${message}${colors.Reset}`;
		throw new Error(errorMessage);
	}

	warning(message: string): void {
		const prefix = "[NACT WARNING]";
		const color = `${this.warningColor}`;
		const startsWith = [this.getTime(color), prefix].join(" ");

		this.__color(color, `${startsWith} ${message}`, "warning");
	}

	info(message: string, subprefix?: string): void {
		const prefix = `[NACT INFO${subprefix ? " / " + subprefix.toUpperCase() : ""}]`;
		const color = `${this.infoColor}`;
		const startsWith = [this.getTime(color), prefix].join(" ");

		this.__color(color, `${startsWith} ${message}`, "info");
	}
}

export { NactLogger, createSharedNactLogger, getNactLogger };
