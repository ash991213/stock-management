import { Body, Controller, Patch } from '@nestjs/common';

import { FairLockService } from '@apps/stock/src/use-case/fair-lock.service';

import { UpdateStockDto } from '@apps/stock/src/adapter/dto/update-stock.dto';
import { StockResDto } from '@apps/stock/src/adapter/dto/stock.res.dto';

@Controller({ version: '1', path: 'stocks/locks/fair' })
export class FairLockController {
    constructor(private readonly fairLockService: FairLockService) {}

    @Patch()
    updateStock(@Body() updateStockDto: UpdateStockDto): Promise<StockResDto[]> {
        return this.fairLockService.updateStock(updateStockDto);
    }
}
