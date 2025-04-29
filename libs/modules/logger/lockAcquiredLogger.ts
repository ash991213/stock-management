import { createLogger, format, transports } from 'winston';
import * as path from 'path';

export const lockAcquiredLogger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    transports: [
        new transports.File({
            filename: path.join(__dirname, 'logs', 'lock_acquired.log'),
            handleExceptions: true,
        }),
    ],
});
