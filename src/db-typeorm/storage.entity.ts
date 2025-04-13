import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { StorageFileStatusEnum } from '../storage';
import { TargetEntity } from './target.entity';

@Entity('storage')
export class StorageEntity {
  @PrimaryColumn('varchar')
  basePath: string;

  @Column({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  @Column('int')
  targetId: number;

  @ManyToOne(() => TargetEntity, (target) => target.storages)
  target?: TargetEntity

  @Column({ type: 'enum', enum: StorageFileStatusEnum, enumName: 'storageFileStatusEnum' })
  status: StorageFileStatusEnum;
}