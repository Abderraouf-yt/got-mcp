/**
 * Logger Utility
 * Provides structured logging for the MCP server.
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

class Logger {
    private level: LogLevel = LogLevel.INFO;

    setLevel(level: LogLevel) {
        this.level = level;
    }

    private log(level: LogLevel, message: string, ...args: any[]) {
        if (level < this.level) return;

        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];
        const formattedMessage = `[${timestamp}] [${levelName}] ${message}`;

        // MCP standard: log to stderr to avoid corrupting stdout (Stdio transport)
        if (level === LogLevel.ERROR) {
            console.error(formattedMessage, ...args);
        } else {
            console.error(formattedMessage, ...args);
        }
    }

    debug(message: string, ...args: any[]) {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    info(message: string, ...args: any[]) {
        this.log(LogLevel.INFO, message, ...args);
    }

    warn(message: string, ...args: any[]) {
        this.log(LogLevel.WARN, message, ...args);
    }

    error(message: string, ...args: any[]) {
        this.log(LogLevel.ERROR, message, ...args);
    }
}

export const logger = new Logger();
