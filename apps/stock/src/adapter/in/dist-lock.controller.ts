import { Body, Controller, Patch } from '@nestjs/common';

import { DistributedLockService } from '@apps/stock/src/use-case/dist-lock.service';

import { UpdateStockDto } from '@apps/stock/src/adapter/dto/update-stock.dto';
import { StockResDto } from '@apps/stock/src/adapter/dto/stock.res.dto';

@Controller({ version: '1', path: 'stocks/locks/distributed' })
export class DistributedLockController {
    constructor(private readonly distributedLockService: DistributedLockService) {}

    @Patch()
    updateStock(@Body() updateStockDto: UpdateStockDto): Promise<StockResDto[]> {
        return this.distributedLockService.updateStock(updateStockDto);
    }
}
