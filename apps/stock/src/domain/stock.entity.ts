import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('stocks')
export class Stock {
    @PrimaryGeneratedColumn()
    idx: number;

    @Column('int')
    quantity: number;
}
