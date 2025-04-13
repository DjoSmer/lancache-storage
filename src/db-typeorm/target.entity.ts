import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { StorageEntity } from './storage.entity';

@Entity('target')
export class TargetEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 20 })
  code: string

  @Column('varchar', { nullable: true })
  host?: string;

  @Column('varchar', { nullable: true })
  userAgent?: string;

  @Column({ type: 'boolean', default: false })
  https?: boolean;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @OneToMany(() => StorageEntity, (storage) => storage.target)
  storages: StorageEntity[]
}