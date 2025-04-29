import { Logger } from '@nestjs/common';

import { AbstractLogger, LogLevel, LogMessage, LoggerOptions } from 'typeorm';

export class TypeOrmLogger extends AbstractLogger {
    private readonly logger = new Logger('TypeormLogger');

    constructor(options?: LoggerOptions) {
        super(options);
    }

    protected writeLog(level: LogLevel, logMessage: LogMessage | LogMessage[]) {
        const messages = this.prepareLogMessages(logMessage, { highlightSql: true, appendParameterAsComment: true, addColonToPrefix: true });

        messages.map((message) => {
            const logLevel: string = message.type ?? level;

            if (['info'].includes(logLevel)) this.logger.verbose(`[${logLevel}] ${message.message}`);
            if (['query'].includes(logLevel)) this.logger.debug(`[${logLevel}] ${message.message}`);
            if (['log', 'schema-build', 'migration'].includes(logLevel)) this.logger.log(`[${logLevel}] ${message.message}`);
            if (['warn', 'query-slow'].includes(logLevel)) this.logger.warn(`[${logLevel}] ${message.message}`);
            if (['error', 'query-error'].includes(logLevel)) this.logger.error(`[${logLevel}] ${message.message}`);
        });
    }
}
