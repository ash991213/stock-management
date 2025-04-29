import { Stock } from '@apps/stock/src/domain/stock.entity';

export interface IStockRepository {
    getAllStocks(): Promise<Stock[]>;
    decrementStocks(stockUpdates: { idx: number; purchaseQuantity: number }[]): Promise<void>;

    // * 테스트 용도
    clear(): Promise<void>;
    save(stock: Partial<Stock>): Promise<Stock>;
    findOne(options: any): Promise<Stock>;
}
