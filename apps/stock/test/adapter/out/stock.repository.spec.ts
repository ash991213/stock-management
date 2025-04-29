import { Test, TestingModule } from '@nestjs/testing';

import { StockRepository } from '@apps/stock/src/adapter/out/stock.repository';
import { Stock } from '@apps/stock/src/domain/stock.entity';

import { LoggerModule } from '@libs/modules/logger/logger.module';
import { EnvConfigModule } from '@libs/modules/config/config.module';
import { DatabaseModule } from '@libs/modules/database/database.module';

import { ResException } from '@libs/utils/res/res.exception';
import { DB_SELECT_FAILED, DB_UPDATE_FAILED } from '@libs/utils/const/error.const';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('StockRepository 테스트', () => {
    let module: TestingModule;
    let repository: StockRepository;

    initializeTransactionalContext();

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [LoggerModule, EnvConfigModule, DatabaseModule.forRootAsync([Stock])],
            providers: [StockRepository],
        }).compile();

        repository = module.get<StockRepository>(StockRepository);
    });

    beforeEach(async () => {
        await repository.clear();
    });

    describe('getAllStocks', () => {
        it('모든 재고를 조회해야 한다', async () => {
            const stocks = [
                { idx: 1, quantity: 100 },
                { idx: 2, quantity: 200 },
                { idx: 3, quantity: 300 },
            ];
            await Promise.all(stocks.map((stock) => repository.save(stock)));

            const result = await repository.getAllStocks();

            expect(result).toHaveLength(3);
            expect(result[0].quantity).toBe(100);
            expect(result[1].quantity).toBe(200);
            expect(result[2].quantity).toBe(300);
        });

        it('DB 조회 실패 시 예외가 발생해야 한다', async () => {
            jest.spyOn(repository['stockRepository'], 'find').mockRejectedValueOnce(new Error('DB 에러'));
            await expect(repository.getAllStocks()).rejects.toThrow(new ResException(DB_SELECT_FAILED));
        });
    });

    describe('decrementStocks', () => {
        it('여러 재고를 한 번에 감소시켜야 한다', async () => {
            await repository.save({ idx: 1, quantity: 100 });
            await repository.save({ idx: 2, quantity: 200 });

            const updates = [
                { idx: 1, purchaseQuantity: 50 },
                { idx: 2, purchaseQuantity: 100 },
            ];

            await repository.decrementStocks(updates);

            const stock1 = await repository.findOne({ where: { idx: 1 } });
            const stock2 = await repository.findOne({ where: { idx: 2 } });
            expect(stock1.quantity).toBe(50);
            expect(stock2.quantity).toBe(100);
        });

        it('DB 업데이트 실패 시 예외가 발생해야 한다', async () => {
            jest.spyOn(repository['stockRepository'], 'createQueryBuilder').mockImplementationOnce(() => {
                throw new Error('DB 에러');
            });

            const updates = [{ idx: 1, purchaseQuantity: 50 }];

            await expect(repository.decrementStocks(updates)).rejects.toThrow(new ResException(DB_UPDATE_FAILED));
        });
    });

    describe('테스트 유틸리티 메서드', () => {
        it('모든 재고를 삭제해야 한다', async () => {
            await repository.save({ idx: 1, quantity: 100 });
            await repository.save({ idx: 2, quantity: 200 });

            await repository.clear();

            const stocks = await repository.getAllStocks();
            expect(stocks).toHaveLength(0);
        });

        it('재고를 저장해야 한다', async () => {
            const stock = { idx: 1, quantity: 100 };
            const saved = await repository.save(stock);

            expect(saved.idx).toBe(1);
            expect(saved.quantity).toBe(100);
        });

        it('특정 재고를 조회해야 한다', async () => {
            await repository.save({ idx: 1, quantity: 100 });

            const found = await repository.findOne({ where: { idx: 1 } });

            expect(found.idx).toBe(1);
            expect(found.quantity).toBe(100);
        });
    });

    afterAll(async () => {
        await module.close();
    });
});
