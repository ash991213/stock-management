import { UpdateStockDto } from '@apps/stock/src/adapter/dto/update-stock.dto';
import { StockResDto } from '@apps/stock/src/adapter/dto/stock.res.dto';

export interface IStockService {
    updateStock(updateStockDto: UpdateStockDto): Promise<StockResDto[]>;
}
