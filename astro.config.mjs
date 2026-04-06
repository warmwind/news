import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://news.oscarjiang.site',
  output: 'static',
  integrations: [
    sitemap({
      changefreq: 'daily',
    }),
  ],
});
