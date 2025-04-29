import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService extends Logger {
    private logger: Logger;

    constructor() {
        super();
        this.logger = new Logger(LoggerService.name);
    }
}
