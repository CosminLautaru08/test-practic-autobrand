import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../abstract/base-entity';

@Entity({ name: 'users' })
export class UserEntity extends BaseEntity {
  @Column({ unique: true, length: 64 })
  username: string;

  @Column({ select: false })
  passwordHash: string;
}
