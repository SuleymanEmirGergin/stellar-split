// Prisma 7 configuration file.
// The database connection URL is provided here instead of schema.prisma
// (Prisma 7 moved datasource URL out of the schema — see https://pris.ly/d/config-datasource)

import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
