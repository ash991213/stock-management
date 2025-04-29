import Redlock from 'redlock';
import Redis, { ChainableCommander, Cluster } from 'ioredis';

export abstract class AbstractCacheService {
    redlock: Redlock;
    protected client: Redis | Cluster;

    constructor(redisClient: Redis | Cluster) {
        this.redlock = new Redlock([redisClient], {
            driftFactor: 0.01,
            retryCount: 100,
            retryDelay: 200,
            retryJitter: 200,
        });
        this.client = redisClient;
    }

    abstract set(key: string, value: any, ttl?: number): Promise<void>;
    abstract get<T>(key: string): Promise<T | null>;
    abstract mget<T>(keys: string[]): Promise<(T | null)[]>;
    abstract del(key: string): Promise<void>;
    abstract publish(channel: string, message: string): Promise<number>;
    abstract duplicate(): Redis | Cluster;
    abstract pipeline(): ChainableCommander;
    abstract expireAllKeys(): Promise<void>;
    abstract getStockKey(idx: string | number): string;
    abstract getLockKey(idx: string | number): string;
    abstract getQueueKey(idx: string | number): string;
    abstract getGlobalCounterKey(idx: string | number): string;
    abstract attemptLock(queueKey: string, lockKey: string, identifier: string, ttl: number): Promise<string | null>;
    abstract releaseLock(lockKey: string, value: string): Promise<boolean>;
    abstract llen(key: string): Promise<number>;
}
