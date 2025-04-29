import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

import { Stock } from '@apps/stock/src/domain/stock.entity';

import { DatabaseService } from '@libs/modules/database/database.service';
import { LoggerService } from '@libs/modules/logger/logger.service';

import { IStockRepository } from '@apps/stock/src/port/out/stock.repository.interface';

import { ResException } from '@libs/utils/res/res.exception';
import { DB_SELECT_FAILED, DB_UPDATE_FAILED } from '@libs/utils/const/error.const';

@Injectable()
export class StockRepository implements IStockRepository {
    private readonly stockRepository: Repository<Stock>;
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly logger: LoggerService,
    ) {
        this.stockRepository = databaseService.getRepository(Stock);
    }

    public async getAllStocks(): Promise<Stock[]> {
        try {
            return await this.stockRepository.find();
        } catch (error) {
            this.logger.error(error);
            throw new ResException(DB_SELECT_FAILED);
        }
    }

    public async decrementStocks(stockUpdates: { idx: number; purchaseQuantity: number }[]): Promise<void> {
        try {
            const ids = stockUpdates.map((update) => update.idx);
            const cases = stockUpdates.map((update) => `WHEN idx = ${update.idx} THEN quantity - ${update.purchaseQuantity}`).join(' ');

            await this.stockRepository
                .createQueryBuilder()
                .update()
                .set({
                    quantity: () => `CASE ${cases} ELSE quantity END`,
                })
                .where('idx IN (:...ids)', { ids })
                .execute();
        } catch (error) {
            this.logger.error(error);
            throw new ResException(DB_UPDATE_FAILED);
        }
    }

    // * 테스트 용도

    async clear(): Promise<void> {
        await this.stockRepository.clear();
    }

    async save(stock: Partial<Stock>): Promise<Stock> {
        return await this.stockRepository.save(stock);
    }

    async findOne(options: any): Promise<Stock> {
        return await this.stockRepository.findOne(options);
    }
}
