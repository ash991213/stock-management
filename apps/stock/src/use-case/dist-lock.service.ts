import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';

import { WithDistLock } from '@apps/stock/src/adapter/out/dist-lock.decorator';

import { LoggerService } from '@libs/modules/logger/logger.service';
import { AbstractCacheService } from '@libs/modules/cache/abstract-cache.service';

import { IStockService } from '@apps/stock/src/port/in/stock.service.interface';
import { StockRepository } from '@apps/stock/src/adapter/out/stock.repository';

import { UpdateStockDto } from '@apps/stock/src/adapter/dto/update-stock.dto';
import { StockMapper } from '@apps/stock/src/adapter/mapper/stock.mapper';
import { StockResDto } from '@apps/stock/src/adapter/dto/stock.res.dto';

import { ResException } from '@libs/utils/res/res.exception';
import { OUT_OF_STOCK, STOCK_NOT_FOUND, STOCK_UPDATE_FAILED } from '@libs/utils/const/error.const';

@Injectable()
export class DistributedLockService implements IStockService {
    constructor(
        private readonly cacheService: AbstractCacheService,
        private readonly stockRepository: StockRepository,
        private readonly logger: LoggerService,
    ) {}

    @WithDistLock((updateStockDto: UpdateStockDto) => updateStockDto.orders.map((order) => order.idx))
    @Transactional()
    public async updateStock(updateStockDto: UpdateStockDto): Promise<StockResDto[]> {
        // * 1. 주문에서 고유 상품 ID 추출
        const orders = updateStockDto.orders;
        const uniqueIds = [...new Set(orders.map((o) => o.idx))];

        // * 2. 캐시 키 준비 및 일괄 조회
        const stockKeys = uniqueIds.map((id) => this.cacheService.getStockKey(id));
        const stockValues = await this.cacheService.mget(stockKeys);

        // * 3. 재고 맵 생성
        const stockMap = new Map<number, number>();
        uniqueIds.forEach((id, i) => {
            if (stockValues[i] === null) throw new ResException(STOCK_NOT_FOUND);
            stockMap.set(id, Number(stockValues[i] || 0));
        });

        // * 4. 재고 부족 검사
        orders.forEach(({ idx, purchaseQuantity }) => {
            if ((stockMap.get(idx) ?? 0) < purchaseQuantity) throw new ResException(OUT_OF_STOCK);
        });

        // * 5. 캐시 업데이트 파이프라인 준비 (롤백 정보 수집)
        const rollbackItems: { key: string; prev: number }[] = [];
        const updatePipeline = this.cacheService.pipeline();
        orders.forEach(({ idx, purchaseQuantity }) => {
            const prev = stockMap.get(idx)!;
            const newQty = prev - purchaseQuantity;
            const key = this.cacheService.getStockKey(idx);

            updatePipeline.set(key, newQty.toString());
            rollbackItems.push({ key, prev });
            stockMap.set(idx, newQty);
        });

        try {
            // * 6. 캐시 일괄 갱신 실행
            await updatePipeline.exec();

            // * 7. DB 일괄 업데이트
            await this.stockRepository.decrementStocks(orders.map((o) => ({ idx: o.idx, purchaseQuantity: o.purchaseQuantity })));

            // * 8. 결과 변환 및 반환
            return StockMapper.toDtoList(orders.map((o) => ({ idx: o.idx, quantity: stockMap.get(o.idx)! })));
        } catch (error) {
            // * 9. 에러 발생 시 캐시 롤백
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
        }
    }
}
