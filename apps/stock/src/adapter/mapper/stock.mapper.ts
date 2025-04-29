import { Stock } from '@apps/stock/src/domain/stock.entity';

import { StockResDto } from '@apps/stock/src/adapter/dto/stock.res.dto';

export class StockMapper {
    public static toDto(stock: Stock): StockResDto {
        const dto = new StockResDto();
        dto.idx = stock.idx;
        dto.quantity = stock.quantity;
        return dto;
    }

    public static toDtoList(stocks: Stock[]): StockResDto[] {
        return stocks.map((stock) => this.toDto(stock));
    }
}
