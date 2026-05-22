import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../abstract/base-entity';

@Entity()
export class ProductEntity extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column('float')
  price: number;

  @Column({ length: 3, default: 'RON' })
  currency: string;

  @Column('float', { default: 1 })
  exchangeRate: number;

  @Column('float', { default: 0 })
  priceRon: number;

  @Column('text')
  description: string;

  @Column()
  imageUrl: string;
}
