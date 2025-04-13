import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source.options';

const dataSource = new DataSource({ ...dataSourceOptions, migrations: ['migrations/*.ts'] });

export default dataSource;
