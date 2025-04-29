import { Injectable } from '@nestjs/common';

import { AbstractEnvConfigService } from '@libs/modules/config/abstract-config.service';

@Injectable()
export class EnvConfigService extends AbstractEnvConfigService {
    PORT = this.get<string>('PORT');

    LOG_LEVEL = this.get<string>('LOG_LEVEL');
    LOG_LEVEL_DB = this.get<string>('LOG_LEVEL_DB');

    DB_HOST = this.get<string>('DB_HOST');
    DB_PORT = this.get<string>('DB_PORT');
    DB_USER = this.get<string>('DB_USER');
    DB_PW = this.get<string>('DB_PW');
    DB_NAME = this.get<string>('DB_NAME');

    REDIS_TYPE = this.get<string>('REDIS_TYPE');
    REDIS_URL = this.get<string>('REDIS_URL');
    REDIS_PORT = this.get<string>('REDIS_PORT');
}
