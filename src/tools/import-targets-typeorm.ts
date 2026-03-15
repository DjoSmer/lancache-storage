import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { createLogger } from '../logger';
import { dataSourceOptions } from '../db-typeorm/data-source.options';
import { TargetEntity } from '../db-typeorm/target.entity';

config();

const db = new DataSource(dataSourceOptions);

const cacheDomainsUrl = process.env.CACHE_DOMAINS_URL;

if (!cacheDomainsUrl) {
  throw new Error(`CACHE_DOMAINS_URL is empty`);
}

async function setup(cacheDomainsUrl: string) {
  const logger = createLogger('ImportTargetTypeorm', { saveToFile: true, console: true });
  const reCacheDomains = await fetch(cacheDomainsUrl);
  const { cache_domains } = await reCacheDomains.json();

  if (!cache_domains) {
    throw new Error(`File ${cacheDomainsUrl} is empty`);
  }

  const baseUrl = cacheDomainsUrl.replace(/[^/]*\.json$/i, '');

  await db.getRepository(TargetEntity).delete({});

  await db.getRepository(TargetEntity).insert([
    {
      code: 'steam',
      userAgent: 'Valve/Steam HTTP Client 1.0',
    },
    {
      code: 'riot',
      userAgent: 'RiotNetwork/1.0.0',
    },
    {
      code: 'any',
    },
  ]);

  const data = [];
  for (const cacheDomain of cache_domains) {
    const code = cacheDomain.name;
    for (const file of cacheDomain.domain_files) {
      const res = await fetch(baseUrl + file);
      const text = await res.text();
      const domains = text.split('\n');

      for (const domain of domains) {
        if (!domain.trim() || domain[0] === '#') continue;

        const host = domain.replace('*', '');
        data.push({
          code,
          host
        });
        logger.info(`Add new target ${code} - ${host}`);
      }
    }
  }

  await db.getRepository(TargetEntity).insert(data);

  logger.info('Done');
  logger.close();
}

db.initialize().then(() => setup(cacheDomainsUrl));
