import { Test, TestingModule } from '@nestjs/testing';

import { DistributedLockService } from '@apps/stock/src/use-case/dist-lock.service';
import { StockRepository } from '@apps/stock/src/adapter/out/stock.repository';

import { UpdateStockDto } from '@apps/stock/src/adapter/dto/update-stock.dto';
import { Stock } from '@apps/stock/src/domain/stock.entity';

import { LoggerModule } from '@libs/modules/logger/logger.module';
import { EnvConfigModule } from '@libs/modules/config/config.module';
import { DatabaseModule } from '@libs/modules/database/database.module';
import { CacheModule } from '@libs/modules/cache/cache.module';

import { AbstractCacheService } from '@libs/modules/cache/abstract-cache.service';

import { ResException } from '@libs/utils/res/res.exception';
import { OUT_OF_STOCK, STOCK_UPDATE_FAILED } from '@libs/utils/const/error.const';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('DistributedLockService 테스트', () => {
    let module: TestingModule;
    let service: DistributedLockService;
    let stockRepository: StockRepository;
    let cacheService: AbstractCacheService;

    initializeTransactionalContext();

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [LoggerModule, EnvConfigModule, DatabaseModule.forRootAsync([Stock]), CacheModule],
            providers: [DistributedLockService, StockRepository],
        }).compile();

        service = module.get<DistributedLockService>(DistributedLockService);
        stockRepository = module.get<StockRepository>(StockRepository);
        cacheService = module.get<AbstractCacheService>(AbstractCacheService);
    });

    afterEach(async () => {
        await stockRepository.clear();
        await cacheService.expireAllKeys();
    });

    describe('updateStock', () => {
        it('정상적인 재고 감소 처리', async () => {
            await stockRepository.save({ idx: 1, quantity: 100 });
            await stockRepository.save({ idx: 2, quantity: 200 });
            await cacheService.set(cacheService.getStockKey(1), '100');
            await cacheService.set(cacheService.getStockKey(2), '200');

            const updateDto = new UpdateStockDto();
            updateDto.orders = [
                { idx: 1, purchaseQuantity: 50 },
                { idx: 2, purchaseQuantity: 100 },
            ];

            const result = await service.updateStock(updateDto);

            expect(result).toHaveLength(2);
            expect(result[0].quantity).toBe(50);
            expect(result[1].quantity).toBe(100);

            const dbStock1 = await stockRepository.findOne({ where: { idx: 1 } });
            const dbStock2 = await stockRepository.findOne({ where: { idx: 2 } });
            expect(dbStock1.quantity).toBe(50);
            expect(dbStock2.quantity).toBe(100);

            const cacheStock1 = await cacheService.get(cacheService.getStockKey(1));
            const cacheStock2 = await cacheService.get(cacheService.getStockKey(2));
            expect(Number(cacheStock1)).toBe(50);
            expect(Number(cacheStock2)).toBe(100);
        });

        it('재고 부족 시 예외 발생 및 롤백', async () => {
            await stockRepository.save({ idx: 3, quantity: 50 });
            await cacheService.set(cacheService.getStockKey(3), '50');

            const updateDto = new UpdateStockDto();
            updateDto.orders = [{ idx: 3, purchaseQuantity: 100 }];

            await expect(service.updateStock(updateDto)).rejects.toThrow(new ResException(OUT_OF_STOCK));

            const dbStock = await stockRepository.findOne({ where: { idx: 3 } });
            const cacheStock = await cacheService.get(cacheService.getStockKey(3));
            expect(dbStock.quantity).toBe(50);
            expect(Number(cacheStock)).toBe(50);
        });

        it('DB 업데이트 실패 시 캐시 롤백', async () => {
            await stockRepository.save({ idx: 1, quantity: 100 });
            await cacheService.set(cacheService.getStockKey(1), '100');

            jest.spyOn(stockRepository, 'decrementStocks').mockRejectedValueOnce(new Error('DB 에러 발생'));

            const updateDto = new UpdateStockDto();
            updateDto.orders = [{ idx: 1, purchaseQuantity: 50 }];

            await expect(service.updateStock(updateDto)).rejects.toThrow(new ResException(STOCK_UPDATE_FAILED));

            const dbStock = await stockRepository.findOne({ where: { idx: 1 } });
            const cacheStock = await cacheService.get(cacheService.getStockKey(1));
            expect(dbStock.quantity).toBe(100);
            expect(Number(cacheStock)).toBe(100);
        });

        it('동시 요청 처리 테스트', async () => {
            await stockRepository.save({ idx: 1, quantity: 100 });
            await cacheService.set(cacheService.getStockKey(1), '100');

            const updateDto = new UpdateStockDto();
            updateDto.orders = [{ idx: 1, purchaseQuantity: 10 }];

            const promises = Array(5)
                .fill(null)
                .map(() => service.updateStock(updateDto));
            await Promise.all(promises);

            const dbStock = await stockRepository.findOne({ where: { idx: 1 } });
            const cacheStock = await cacheService.get(cacheService.getStockKey(1));
            expect(dbStock.quantity).toBe(50);
            expect(Number(cacheStock)).toBe(50);
        });
    });

    afterAll(async () => {
        await module.close();
    });
});
