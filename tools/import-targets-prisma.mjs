import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
const prisma = new PrismaClient();

const cacheDomainsUrl = process.env.CACHE_DOMAINS_URL;

const reCacheDomains = await fetch(cacheDomainsUrl);
const { cache_domains } = await reCacheDomains.json();

if (!cache_domains) {
  throw new Error(`File ${cacheDomainsUrl} is empty`);
}

const baseUrl = cacheDomainsUrl.replace(/[^/]*\.json$/i, '');

await prisma.target.deleteMany({
  where: {
   NOT: {
     code: 'all'
   }
  }
});

await prisma.target.createMany({
  data: [
    {
      code: 'steam',
      userAgent: 'Valve/Steam HTTP Client 1.0',
    },
    {
      code: 'riot',
      userAgent: 'RiotNetwork/1.0.0',
    },
  ],
});

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
      console.log(`Add new target ${code} - ${host}`);
    }
  }
}

await prisma.target.createMany({
  data,
});

console.log(`Done`);
