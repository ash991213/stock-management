import { DataSource, EntityTarget, Repository } from 'typeorm';

export abstract class AbstractDatabaseService {
    abstract getDataSource(): DataSource;
    abstract getRepository<T>(entity: EntityTarget<T>): Repository<T>;
}
