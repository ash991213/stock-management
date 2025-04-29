import { DynamicModule, Module } from '@nestjs/common';
import { DataSource, LogLevel } from 'typeorm';

import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvConfigModule } from '@libs/modules/config/config.module';

import { AbstractEnvConfigService } from '@libs/modules/config/abstract-config.service';
import { DatabaseService } from '@libs/modules/database/database.service';

import { TypeOrmLogger } from '@libs/modules/database/typeorm-logger';

import { addTransactionalDataSource } from 'typeorm-transactional';

@Module({
    imports: [EnvConfigModule],
})
export class DatabaseModule {
    static forRootAsync(entities = []): DynamicModule {
        return {
            module: DatabaseModule,
            imports: [
                TypeOrmModule.forRootAsync({
                    imports: [EnvConfigModule],
                    inject: [AbstractEnvConfigService],
                    useFactory: (configService: AbstractEnvConfigService) => {
                        return {
                            type: 'mysql',
                            host: configService.DB_HOST,
                            port: Number(configService.DB_PORT),
                            username: configService.DB_USER,
                            password: configService.DB_PW,
                            database: configService.DB_NAME,
                            synchronize: false,
                            logging: true,
                            logger: new TypeOrmLogger([configService.LOG_LEVEL_DB as LogLevel]),
                            entities: entities,
                            extra: {
                                connectionLimit: 100,
                            },
                        };
                    },
                    async dataSourceFactory(options) {
                        if (!options) {
                            throw new Error('Invalid options passed');
                        }
                        return addTransactionalDataSource(new DataSource(options));
                    },
                }),
            ],
            providers: [
                DatabaseService,
                {
                    provide: 'DATA_SOURCE',
                    useFactory: (dataSource: DataSource) => dataSource,
                    inject: [DataSource],
                },
            ],
            exports: [DatabaseService],
        };
    }
}
