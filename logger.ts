const colors = {
    Reset: '\x1b[0m',
    Bright: '\x1b[1m',
    Dim: '\x1b[2m',
    Underscore: '\x1b[4m',
    Blink: '\x1b[5m',
    Reverse: '\x1b[7m',
    Hidden: '\x1b[8m',

    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

type LoggerAvailableColors = keyof typeof colors;

interface LoggerBaseColors {
    log?: LoggerAvailableColors;
    error?: LoggerAvailableColors;
    warning?: LoggerAvailableColors;
}

export default class NactLogger {
    logColor: LoggerAvailableColors;
    warningColor: LoggerAvailableColors;
    errorColor: LoggerAvailableColors;

    constructor(color?: LoggerBaseColors) {
        this.logColor = (color?.log ?? colors.green) as LoggerAvailableColors;
        this.warningColor = (color?.warning ?? colors.yellow) as LoggerAvailableColors;
        this.errorColor = (color?.error ?? colors.red) as LoggerAvailableColors;
    }

    protected __color(color: string, message: string): void {
        console.log(color, message, colors.Reset);
    }

    log(message: string): void {
        const prefix = `[NACT LOG]`;
        const color = `${this.logColor}`;
        this.__color(color, `${prefix} ${message}`);
    }

    error(message: string): void {
        const prefix = `[NACT ERROR]`;
        const color = `${this.errorColor}`;
        const errorMessage = `${color}${prefix} ${message}${colors.Reset}`;
        throw new Error(errorMessage);
    }
}
