import { config } from 'dotenv';
import { DataSourceOptions } from 'typeorm';
import { StorageEntity } from './storage.entity';
import { TargetEntity } from './target.entity';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [StorageEntity, TargetEntity],
  synchronize: false,
  logging: false,
}