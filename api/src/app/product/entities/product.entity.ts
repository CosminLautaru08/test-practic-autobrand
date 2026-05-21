import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../abstract/base-entity';

@Entity()
export class ProductEntity extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column('float')
  price: number;

  @Column('text')
  description: string;

  @Column()
  imageUrl: string;
}
