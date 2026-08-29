import { useEffect } from 'react';

export const SITE_NAME = 'پولاریس استایل';
export const SITE_ORIGIN = 'https://polarisstyle.ir';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Per-page SEO meta for the SPA: document title, description, canonical URL
 * and Open Graph tags. The static defaults live in index.html; this hook
 * keeps them in sync with the route after client-side navigation.
 */
export function usePageMeta(title: string, description: string, path = '/') {
  useEffect(() => {
    const fullTitle = path === '/' ? title : `${title} | ${SITE_NAME}`;
    const url = `${SITE_ORIGIN}${path}`;

    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertCanonical(url);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
  }, [title, description, path]);
}
