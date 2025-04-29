import { Type } from 'class-transformer';
import { IsArray, IsNumber, NotEquals, ValidateNested } from 'class-validator';

export class StockUpdateDto {
    @IsNumber()
    idx: number;

    @IsNumber()
    @NotEquals(0, { message: '구매 수량은 0이 될 수 없습니다.' })
    purchaseQuantity: number;
}

export class UpdateStockDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StockUpdateDto)
    orders: StockUpdateDto[];
}
