import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, Repository } from 'typeorm';

import { AbstractDatabaseService } from '@libs/modules/database/abstract-database.service';

@Injectable()
export class DatabaseService extends AbstractDatabaseService {
    constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) {
        super();
    }

    getDataSource(): DataSource {
        return this.dataSource;
    }

    getRepository<T>(entity: EntityTarget<T>): Repository<T> {
        return this.dataSource.getRepository(entity);
    }
}
