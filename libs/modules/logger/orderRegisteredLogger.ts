import { createLogger, format, transports } from 'winston';
import * as path from 'path';

export const orderRegisteredLogger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    transports: [
        new transports.File({
            filename: path.join(__dirname, 'logs', 'order_registered.log'),
            handleExceptions: true,
        }),
    ],
});
