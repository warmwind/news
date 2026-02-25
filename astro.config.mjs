import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://news.oscarjiang.site',
  output: 'static',
  integrations: [
    sitemap({
      changefreq: 'daily',
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', zh: 'zh', fr: 'fr', de: 'de', es: 'es' },
      },
    }),
  ],
});
