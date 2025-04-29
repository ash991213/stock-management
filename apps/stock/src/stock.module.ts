import { Inject, Module, OnModuleInit } from '@nestjs/common';

import { LoggerModule } from '@libs/modules/logger/logger.module';
import { EnvConfigModule } from '@libs/modules/config/config.module';
import { DatabaseModule } from '@libs/modules/database/database.module';
import { CacheModule } from '@libs/modules/cache/cache.module';

import { FairLockController } from '@apps/stock/src/adapter/in/fair-lock.controller';
import { DistributedLockController } from '@apps/stock/src/adapter/in/dist-lock.controller';

import { FairLockService } from '@apps/stock/src/use-case/fair-lock.service';
import { DistributedLockService } from '@apps/stock/src/use-case/dist-lock.service';

import { AbstractCacheService } from '@libs/modules/cache/abstract-cache.service';

import { StockRepository } from '@apps/stock/src/adapter/out/stock.repository';

import { Stock } from '@apps/stock/src/domain/stock.entity';
@Module({
    imports: [LoggerModule, EnvConfigModule, DatabaseModule.forRootAsync([Stock]), CacheModule],
    controllers: [DistributedLockController, FairLockController],
    providers: [DistributedLockService, FairLockService, StockRepository],
})
export class StockModule implements OnModuleInit {
    constructor(
        @Inject(AbstractCacheService)
        private readonly cacheService: AbstractCacheService,
        private readonly stockRepository: StockRepository,
    ) {}

    async onModuleInit() {
        try {
            const stocks = await this.stockRepository.getAllStocks();
            await this.cacheService.expireAllKeys();
            await Promise.all(
                stocks.map(async (stock) => {
                    const stockKey = this.cacheService.getStockKey(stock.idx);
                    await this.cacheService.set(stockKey, stock.quantity);
                }),
            );
        } catch (error) {
            throw new Error(`Cache Warm-Up Error: ${error instanceof Error ? error.message : error}`);
        }
    }
}
