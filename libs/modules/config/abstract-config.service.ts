import { ConfigService } from '@nestjs/config';

export abstract class AbstractEnvConfigService extends ConfigService {
    PORT: string = this.get<string>('PORT');

    LOG_LEVEL: string = this.get<string>('LOG_LEVEL');
    LOG_LEVEL_DB: string = this.get<string>('LOG_LEVEL_DB');

    DB_HOST: string = this.get<string>('DB_HOST');
    DB_PORT: string = this.get<string>('DB_PORT');
    DB_USER: string = this.get<string>('DB_USER');
    DB_PW: string = this.get<string>('DB_PW');
    DB_NAME: string = this.get<string>('DB_NAME');

    REDIS_TYPE: string = this.get<string>('REDIS_TYPE');
    REDIS_URL: string = this.get<string>('REDIS_URL');
    REDIS_PORT: string = this.get<string>('REDIS_PORT');
}
