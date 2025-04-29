import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';

import { initializeTransactionalContext } from 'typeorm-transactional';

import { StockModule } from '@apps/stock/src/stock.module';

import { AbstractEnvConfigService } from '@libs/modules/config/abstract-config.service';

import { LoggingInterceptor } from '@libs/utils/interceptor/logger.interceptor';
import { AllExceptionsFilter } from '@libs/utils/filter/exception.filter';
import { ValidationErrorHandlingPipe } from '@libs/utils/pipe/validation.pipe';

async function bootstrap() {
    initializeTransactionalContext();

    const app = await NestFactory.create(StockModule);

    const configService = app.get(AbstractEnvConfigService);

    app.enableCors();

    app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });

    app.useGlobalInterceptors(new LoggingInterceptor());

    app.useGlobalPipes(new ValidationErrorHandlingPipe());

    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

    await app.listen(configService.PORT);
}
bootstrap();
