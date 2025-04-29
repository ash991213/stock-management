import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';

import Redis, { ChainableCommander, Cluster } from 'ioredis';

import { fairLockScript, unlockScript } from '@libs/utils/const/luaScript';

import { LoggerService } from '@libs/modules/logger/logger.service';
import { AbstractCacheService } from '@libs/modules/cache/abstract-cache.service';

import { ResException } from '@libs/utils/res/res.exception';
import { REDIS_DEL_FAILED, REDIS_EXPIRE_ALL_KEYS_FAILED, REDIS_GET_FAILED, REDIS_PUBLISH_FAILED, REDIS_SET_FAILED } from '@libs/utils/const/error.const';

@Injectable()
export class CacheService extends AbstractCacheService {
    private readonly TAG = '{stock}';

    constructor(
        @InjectRedis() private readonly redisClient: Redis | Cluster,
        private readonly logger: LoggerService,
    ) {
        super(redisClient);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 1) 기본 Redis 명령 추상화
    // ────────────────────────────────────────────────────────────────────────
    public async set(key: string, value: any, ttl: number = 3000): Promise<void> {
        try {
            await this.redisClient.set(key, JSON.stringify(value), 'EX', ttl);
        } catch (error) {
            this.logger.error(error);
            throw new ResException(REDIS_SET_FAILED);
        }
    }

    public async get<T>(key: string): Promise<T | null> {
        try {
            const data = await this.redisClient.get(key);
            if (!data) return null;
            return JSON.parse(data) as T;
        } catch (error) {
            this.logger.error(REDIS_GET_FAILED);
            throw new ResException(REDIS_GET_FAILED);
        }
    }

    public async mget<T>(keys: string[]): Promise<(T | null)[]> {
        try {
            if (keys.length === 0) return [];

            const pipeline = this.redisClient.pipeline();
            keys.forEach((key) => pipeline.get(key));
            const results = await pipeline.exec();

            return results.map(([error, value]) => {
                if (error) {
                    throw error;
                }
                if (typeof value === 'string') {
                    return JSON.parse(value) as T;
                }
                return null;
            });
        } catch (error) {
            this.logger.error(error);
            throw new ResException(REDIS_GET_FAILED);
        }
    }

    public async del(key: string): Promise<void> {
        try {
            await this.redisClient.del(key);
        } catch (error) {
            this.logger.error(error);
            throw new ResException(REDIS_DEL_FAILED);
        }
    }

    async llen(key: string): Promise<number> {
        return await this.client.llen(key);
    }

    public async publish(channel: string, message: string): Promise<number> {
        try {
            return await this.client.publish(channel, message);
        } catch (error) {
            this.logger.error(error);
            throw new ResException(REDIS_PUBLISH_FAILED);
        }
    }

    public duplicate(): Redis | Cluster {
        return this.client.duplicate();
    }

    public pipeline(): ChainableCommander {
        return this.client.pipeline();
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2) 테스트 초기화 함수 (전체 키 삭제)
    // ────────────────────────────────────────────────────────────────────────
    public async expireAllKeys(): Promise<void> {
        try {
            if (this.redisClient instanceof Cluster) {
                const masters = this.redisClient.nodes('master');
                await Promise.all(
                    masters.map(async (node) => {
                        try {
                            const result = await node.flushdb();
                            this.logger.log(`${this.constructor.name} - Flushed DB on master ${node.options.host}:${node.options.port} - Result: ${result}`);
                        } catch (error) {
                            if (error.message && error.message.includes('READONLY')) {
                                this.logger.warn(`${this.constructor.name} - Skipping flush on read-only node ${node.options.host}:${node.options.port}`);
                            } else {
                                throw error;
                            }
                        }
                    }),
                );
            } else {
                const result = await this.redisClient.flushdb();
                this.logger.log(`${this.constructor.name} - Flushed DB on single node - Result: ${result}`);
            }
            this.logger.log(`${this.constructor.name} - All keys have been expired (flushed) successfully.`);
        } catch (error) {
            this.logger.error(`${this.constructor.name} - Error while expiring all keys:`, error);
            throw new ResException(REDIS_EXPIRE_ALL_KEYS_FAILED);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3) Key Helper 함수 (해시 태그 포함)
    // ────────────────────────────────────────────────────────────────────────
    public getStockKey(stockId: string | number): string {
        return `${this.TAG}:stock:${stockId}`;
    }

    public getLockKey(stockId: string | number): string {
        return `${this.TAG}:lock:stock:${stockId}`;
    }

    public getQueueKey(stockId: string | number): string {
        return `${this.TAG}:lock_queue:stock:${stockId}`;
    }

    public getGlobalCounterKey(stockId: string | number): string {
        return `${this.TAG}:lock_queue_total:stock:${stockId}`;
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4) Fair Lock 관련 메서드
    // ────────────────────────────────────────────────────────────────────────
    public async attemptLock(queueKey: string, lockKey: string, identifier: string, ttl: number): Promise<string | null> {
        const result = await this.client.eval(fairLockScript, 2, queueKey, lockKey, identifier, ttl);
        return result as string | null;
    }

    public async releaseLock(lockKey: string, identifier: string): Promise<boolean> {
        const result = await this.client.eval(unlockScript, 1, lockKey, identifier);
        if (result === 1) {
            return true;
        } else {
            return false;
        }
    }
}
