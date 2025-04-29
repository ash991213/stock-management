import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';

import { AbstractCacheService } from '@libs/modules/cache/abstract-cache.service';
import { LoggerService } from '@libs/modules/logger/logger.service';

import { IStockService } from '@apps/stock/src/port/in/stock.service.interface';
import { StockRepository } from '@apps/stock/src/adapter/out/stock.repository';

import { UpdateStockDto } from '@apps/stock/src/adapter/dto/update-stock.dto';
import { StockResDto } from '@apps/stock/src/adapter/dto/stock.res.dto';
import { StockMapper } from '@apps/stock/src/adapter/mapper/stock.mapper';

import { ResException } from '@libs/utils/res/res.exception';
import { OUT_OF_STOCK, STOCK_NOT_FOUND, STOCK_UPDATE_FAILED } from '@libs/utils/const/error.const';

import { orderRegisteredLogger } from '@libs/modules/logger/orderRegisteredLogger';
import { lockAcquiredLogger } from '@libs/modules/logger/lockAcquiredLogger';

import { randomBytes } from 'crypto';

@Injectable()
export class FairLockService implements IStockService {
    private readonly CHANNEL = 'stock_task_channel';

    constructor(
        private readonly cacheService: AbstractCacheService,
        private readonly stockRepository: StockRepository,
        private readonly logger: LoggerService,
    ) {}

    @Transactional()
    public async updateStock(updateStockDto: UpdateStockDto): Promise<StockResDto[]> {
        const orders = updateStockDto.orders;
        const identifiers = new Map<number, string>();
        const rollbackItems: { key: string; prev: number }[] = [];

        // * 1. identifier 생성
        [...new Set(orders.map((o) => o.idx))].forEach((idx) => identifiers.set(idx, randomBytes(16).toString('hex')));

        // * 2. 요청 일괄 등록
        const registerPipeline = this.cacheService.pipeline();
        orders.forEach((order) => {
            const identifier = identifiers.get(order.idx)!;
            const queueKey = this.cacheService.getQueueKey(order.idx);
            const counterKey = this.cacheService.getGlobalCounterKey(order.idx);
            registerPipeline.incr(counterKey);
            registerPipeline.rpush(queueKey, identifier);
        });
        const registerResults = await registerPipeline.exec();

        orders.forEach((order, i) => {
            const [, totalWaitingPosition] = registerResults[2 * i];
            const [, waitingPosition] = registerResults[2 * i + 1];

            this.logger.log(`요청 등록: idx ${order.idx}, 순서 ${waitingPosition}, 전체 ${totalWaitingPosition}`);
            orderRegisteredLogger.info({
                event: 'REQUEST_REGISTERED',
                identifier: identifiers.get(order.idx)!,
                waitingPosition,
                totalWaitingPosition,
            });
        });

        // * 3. 단일 구독자로 락 획득
        const subscriber = this.cacheService.duplicate();
        await subscriber.subscribe(this.CHANNEL);
        try {
            await Promise.all(orders.map((order) => this.attemptLock(order.idx, identifiers.get(order.idx)!, subscriber)));
        } catch (err) {
            await subscriber.unsubscribe(this.CHANNEL);
            await subscriber.quit();
            throw err;
        }

        try {
            // * 4. 재고 일괄 조회
            const stockIds = [...new Set(orders.map((o) => o.idx))];
            const stockKeys = stockIds.map((id) => this.cacheService.getStockKey(id));
            const stockValues = await this.cacheService.mget(stockKeys);
            const stockMap = new Map<number, number>();
            stockIds.forEach((id, i) => {
                if (stockValues[i] === null) throw new ResException(STOCK_NOT_FOUND);
                stockMap.set(id, Number(stockValues[i] || 0));
            });
            // * 5. 검증 및 롤백 준비
            orders.forEach((order) => {
                const current = stockMap.get(order.idx)!;
                rollbackItems.push({ key: this.cacheService.getStockKey(order.idx), prev: current });
                if (current < order.purchaseQuantity) throw new ResException(OUT_OF_STOCK);
            });

            // * 6. 캐시 일괄 갱신
            const updatePipeline = this.cacheService.pipeline();
            orders.forEach((order) => {
                const key = this.cacheService.getStockKey(order.idx);
                const newQty = stockMap.get(order.idx)! - order.purchaseQuantity;
                updatePipeline.set(key, newQty.toString());
                stockMap.set(order.idx, newQty);
            });
            await updatePipeline.exec();

            // * 7. DB 일괄 업데이트
            await this.stockRepository.decrementStocks(orders.map((o) => ({ idx: o.idx, purchaseQuantity: o.purchaseQuantity })));

            // * 8. DTO 반환
            return StockMapper.toDtoList(orders.map((o) => ({ idx: o.idx, quantity: stockMap.get(o.idx)! })));
        } catch (error) {
            const rollbackPipeline = this.cacheService.pipeline();
            rollbackItems.forEach(({ key, prev }) => {
                rollbackPipeline.set(key, prev.toString());
            });
            await rollbackPipeline.exec();

            if (error instanceof ResException) {
                throw error;
            } else {
                this.logger.error(error);
                throw new ResException(STOCK_UPDATE_FAILED);
            }
        } finally {
            await this.releaseAllLocks(orders, identifiers);
        }
    }

    private async attemptLock(idx: number, identifier: string, subscriber: ReturnType<AbstractCacheService['duplicate']>): Promise<void> {
        const queueKey = this.cacheService.getQueueKey(idx);
        const lockKey = this.cacheService.getLockKey(idx);
        const result = await this.cacheService.attemptLock(queueKey, lockKey, identifier, 1000);
        if (result === 'OK') {
            this.logger.log(`락 획득: idx ${idx}, identifier ${identifier}`);
            lockAcquiredLogger.info({ event: 'LOCK_ACQUIRED', identifier });
            return;
        }
        await new Promise<void>((resolve) => {
            const onMessage = async (_channel: string, message: string) => {
                if (message === `${lockKey}:released`) {
                    const retry = await this.cacheService.attemptLock(queueKey, lockKey, identifier, 1000);
                    if (retry === 'OK') {
                        subscriber.removeListener('message', onMessage);
                        this.logger.log(`락 획득: idx ${idx}, identifier ${identifier}`);
                        lockAcquiredLogger.info({ event: 'LOCK_ACQUIRED', identifier });
                        resolve();
                    }
                }
            };
            subscriber.on('message', onMessage);
        });
    }

    private async releaseAllLocks(orders: { idx: number }[], idsMap: Map<number, string>): Promise<void> {
        for (const order of orders) {
            const identifier = idsMap.get(order.idx);
            if (!identifier) continue;
            const lockKey = this.cacheService.getLockKey(order.idx);
            const released = await this.cacheService.releaseLock(lockKey, identifier);
            if (released) {
                this.logger.log(`락 해제: ${lockKey} (identifier: ${identifier})`);
                await this.cacheService.publish(this.CHANNEL, `${lockKey}:released`);
            }
        }
    }
}
