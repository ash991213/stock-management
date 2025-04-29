import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EnvConfigService } from '@libs/modules/config/config.service';

import { AbstractEnvConfigService } from '@libs/modules/config/abstract-config.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: 'libs/modules/config/env/.env',
            isGlobal: true,
            cache: true,
        }),
    ],
    providers: [
        {
            provide: AbstractEnvConfigService,
            useClass: EnvConfigService,
        },
    ],
    exports: [AbstractEnvConfigService],
})
export class EnvConfigModule {}
