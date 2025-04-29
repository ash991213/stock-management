import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import * as request from 'supertest';

import { StockModule } from '@apps/stock/src/stock.module';
import { UpdateStockDto } from '@apps/stock/src/adapter/dto/update-stock.dto';
import { StockRepository } from '@apps/stock/src/adapter/out/stock.repository';
import { AbstractCacheService } from '@libs/modules/cache/abstract-cache.service';

import { LoggingInterceptor } from '@libs/utils/interceptor/logger.interceptor';
import { ValidationErrorHandlingPipe } from '@libs/utils/pipe/validation.pipe';
import { AllExceptionsFilter } from '@libs/utils/filter/exception.filter';
import { OUT_OF_STOCK } from '@libs/utils/const/error.const';

import { initializeTransactionalContext } from 'typeorm-transactional';

describe('Stock API 테스트', () => {
    let app: INestApplication;
    let stockRepository: StockRepository;
    let cacheService: AbstractCacheService;

    initializeTransactionalContext();

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [StockModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        stockRepository = moduleFixture.get<StockRepository>(StockRepository);
        cacheService = moduleFixture.get<AbstractCacheService>(AbstractCacheService);

        app.enableCors();
        app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
        app.useGlobalInterceptors(new LoggingInterceptor());
        app.useGlobalPipes(new ValidationErrorHandlingPipe());
        app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
        await app.init();
    });

    beforeEach(async () => {
        await stockRepository.save({ idx: 1, quantity: 100 });
        await stockRepository.save({ idx: 2, quantity: 200 });
        await stockRepository.save({ idx: 3, quantity: 300 });

        await cacheService.set(cacheService.getStockKey(1), '100');
        await cacheService.set(cacheService.getStockKey(2), '200');
        await cacheService.set(cacheService.getStockKey(3), '300');
    });

    afterEach(async () => {
        await stockRepository.clear();
        await cacheService.expireAllKeys();
    });

    describe('재고 업데이트 API', () => {
        const validStockUpdateDto: UpdateStockDto = {
            orders: [
                { idx: 1, purchaseQuantity: 1 },
                { idx: 2, purchaseQuantity: 1 },
                { idx: 3, purchaseQuantity: 1 },
            ],
        };

        const insufficientStockUpdateDto: UpdateStockDto = {
            orders: [
                { idx: 1, purchaseQuantity: 10000 },
                { idx: 2, purchaseQuantity: 10000 },
                { idx: 3, purchaseQuantity: 10000 },
            ],
        };

        describe('Fair Lock API', () => {
            it('재고를 정상적으로 업데이트 해야한다', async () => {
                const { body, statusCode } = await request(app.getHttpServer()).patch('/v1/stocks/locks/fair').send(validStockUpdateDto).set('Accept', 'application/json');

                expect(statusCode).toBe(200);
                expect(Array.isArray(body)).toBe(true);
                expect(body).toHaveLength(validStockUpdateDto.orders.length);
            });

            it('재고가 부족할 경우 실패해야 한다', async () => {
                const { body, statusCode } = await request(app.getHttpServer()).patch('/v1/stocks/locks/fair').send(insufficientStockUpdateDto).set('Accept', 'application/json');

                expect(statusCode).toBe(400);
                expect(body.message).toBe(OUT_OF_STOCK.message);
            });
        });

        describe('Distributed Lock API', () => {
            it('재고를 정상적으로 업데이트 해야한다', async () => {
                const { body, statusCode } = await request(app.getHttpServer()).patch('/v1/stocks/locks/distributed').send(validStockUpdateDto).set('Accept', 'application/json');

                expect(statusCode).toBe(200);
                expect(Array.isArray(body)).toBe(true);
                expect(body).toHaveLength(validStockUpdateDto.orders.length);
            });

            it('재고가 부족할 경우 실패해야 한다', async () => {
                const { body, statusCode } = await request(app.getHttpServer()).patch('/v1/stocks/locks/distributed').send(insufficientStockUpdateDto).set('Accept', 'application/json');

                expect(statusCode).toBe(400);
                expect(body.message).toBe(OUT_OF_STOCK.message);
            });
        });
    });

    afterAll(async () => {
        await app.close();
    });
});
