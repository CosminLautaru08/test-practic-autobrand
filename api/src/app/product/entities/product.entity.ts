import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  title: string;

  @Column('float')
  price: number;

  @Column('text')
  description: string;

  @Column()
  imageUrl: string;
}
