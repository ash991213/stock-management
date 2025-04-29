import { Module } from '@nestjs/common';

import { LoggerService } from '@libs/modules/logger/logger.service';

@Module({
    providers: [LoggerService],
    exports: [LoggerService],
})
export class LoggerModule {}
