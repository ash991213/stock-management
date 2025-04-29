import { Module } from '@nestjs/common';

import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { LoggerModule } from '@libs/modules/logger/logger.module';
import { EnvConfigModule } from '@libs/modules/config/config.module';

import { CacheService } from '@libs/modules/cache/cache.service';

import { AbstractCacheService } from '@libs/modules/cache/abstract-cache.service';
import { AbstractEnvConfigService } from '@libs/modules/config/abstract-config.service';

@Module({
    imports: [
        LoggerModule,
        RedisModule.forRootAsync({
            imports: [EnvConfigModule],
            inject: [AbstractEnvConfigService],
            useFactory: async (configService: AbstractEnvConfigService): Promise<RedisModuleOptions> => {
                const redisType = configService.REDIS_TYPE;
                const port = Number(configService.REDIS_PORT);
                const host = configService.REDIS_URL;

                return redisType === 'cluster'
                    ? {
                          type: 'cluster',
                          nodes: [{ host, port }],
                      }
                    : {
                          type: 'single',
                          url: `${host}:${port}`,
                      };
            },
        }),
    ],
    providers: [
        {
            provide: AbstractCacheService,
            useClass: CacheService,
        },
    ],
    exports: [AbstractCacheService],
})
export class CacheModule {}
