/**
 * @fileoverview Logging utilities for RabbitMQ services.
 * Provides type-safe error handling and log level management.
 */

/**
 * Available log levels for RabbitMQ services.
 * - 'none': Disable all logging
 * - 'error': Only error messages
 * - 'warn': Errors and warnings
 * - 'log': Errors, warnings, and info messages
 * - 'debug': All messages including debug output
 */
export type LogLevel = 'debug' | 'error' | 'log' | 'none' | 'warn';

/**
 * Numeric order of log levels for comparison.
 * Lower numbers = higher priority (more critical).
 * @internal
 */
const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 3,
    error: 0,
    log: 2,
    none: -1,
    warn: 1,
};

/**
 * Safely extracts the error message from an unknown error type.
 * Handles both Error instances and primitive values.
 *
 * @param {unknown} error - The error to extract the message from (can be any type)
 * @returns {string} The error message string
 *
 * @example
 * ```typescript
 * try {
 *   throw new Error('Something went wrong');
 * } catch (error) {
 *   console.log(getErrorMessage(error)); // 'Something went wrong'
 * }
 *
 * // Also works with non-Error values
 * getErrorMessage('plain string'); // 'plain string'
 * getErrorMessage(404); // '404'
 * ```
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

/**
 * Safely extracts the stack trace from an unknown error type.
 * Returns undefined for non-Error values.
 *
 * @param {unknown} error - The error to extract the stack from (can be any type)
 * @returns {string | undefined} The stack trace string, or undefined if not an Error
 *
 * @example
 * ```typescript
 * try {
 *   throw new Error('Something went wrong');
 * } catch (error) {
 *   const stack = getErrorStack(error);
 *   if (stack) {
 *     logger.error('Error occurred:', stack);
 *   }
 * }
 * ```
 */
export function getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
}

/**
 * Determines whether a log message should be output based on the configured log level.
 * Messages are logged if their priority is equal to or higher than the configured threshold.
 *
 * @param {Exclude<LogLevel, 'none'>} level - The level of the message to log
 * @param {LogLevel} configuredLevel - The configured log level threshold
 * @returns {boolean} True if the message should be logged, false otherwise
 *
 * @example
 * ```typescript
 * const configuredLevel: LogLevel = 'warn';
 *
 * shouldLog('error', configuredLevel); // true (error is higher priority than warn)
 * shouldLog('warn', configuredLevel);  // true (same priority)
 * shouldLog('log', configuredLevel);   // false (log is lower priority than warn)
 * shouldLog('debug', configuredLevel); // false (debug is lowest priority)
 *
 * // With 'none' configured, nothing is logged
 * shouldLog('error', 'none'); // false
 * ```
 */
export function shouldLog(level: Exclude<LogLevel, 'none'>, configuredLevel: LogLevel): boolean {
    return LOG_LEVEL_ORDER[level] <= LOG_LEVEL_ORDER[configuredLevel];
}
