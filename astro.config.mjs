// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  base: process.env.BASE_PATH || '/',
  security: {
    checkOrigin: false,
  },
});
