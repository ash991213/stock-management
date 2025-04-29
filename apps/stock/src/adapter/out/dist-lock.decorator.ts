import { Lock } from 'redlock';

import { UpdateStockDto } from '@apps/stock/src/adapter/dto/update-stock.dto';

import { ResException } from '@libs/utils/res/res.exception';
import { REDIS_LOCK_ACQUIRE_FAILED } from '@libs/utils/const/error.const';

import { orderRegisteredLogger } from '@libs/modules/logger/orderRegisteredLogger';
import { lockAcquiredLogger } from '@libs/modules/logger/lockAcquiredLogger';

import { randomBytes } from 'crypto';

export function WithDistLock(lockIds: (dto: UpdateStockDto) => number[], ttl: number = 1000) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]): Promise<any> {
            // * 1. 요청 등록 로그
            const identifier = randomBytes(16).toString('hex');
            orderRegisteredLogger.info({ event: 'REQUEST_REGISTERED', identifier });

            // * 2. 락 리소스 키 배열 생성
            const ids = lockIds(...(args as [UpdateStockDto]));
            const resourceKeys = ids.map((id) => this.cacheService.getLockKey(id));
            let compositeLock: Lock;

            // * 3. 멀티 키 락 획득
            try {
                compositeLock = await this.cacheService.redlock.acquire(resourceKeys, ttl);
                lockAcquiredLogger.info({ event: 'LOCK_ACQUIRED', identifier });
            } catch (error) {
                this.logger.error('락 획득 실패', error);
                throw new ResException(REDIS_LOCK_ACQUIRE_FAILED);
            }

            try {
                // * 4. 실제 비즈니스 로직 실행
                return await originalMethod.apply(this, args);
            } finally {
                try {
                    await compositeLock.release();
                } catch (err) {
                    this.logger.error('락 해제 실패', err);
                }
            }
        };

        return descriptor;
    };
}
