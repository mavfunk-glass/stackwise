import type { Supplement } from '../types/stackwise';
import {
  amazonProductUrl,
  amazonSearchUrl,
  iHerbProductUrl,
  iHerbSearchUrl,
  looksLikeAmazonProductRef,
  looksLikeIHerbProductRef,
} from './url';

function displayName(s: Supplement): string {
  return s.name?.trim() || '';
}

/** Primary Amazon href: product URL → ASIN → legacy combined field → name search. */
export function supplementAmazonHref(s: Supplement): string {
  const n = displayName(s);
  if (s.amazonUrl?.trim()) return amazonProductUrl(s.amazonUrl, n);
  if (s.amazonAsin?.trim()) return amazonProductUrl(s.amazonAsin, n);
  if (s.amazonUrlOrAsin?.trim()) return amazonProductUrl(s.amazonUrlOrAsin, n);
  return amazonSearchUrl(n);
}

/** Secondary search link (e.g. “Search instead”) using saved search terms when present. */
export function supplementAmazonSearchHref(s: Supplement): string {
  return amazonSearchUrl(s.amazonSearchTerm?.trim() || displayName(s));
}

/** Primary iHerb href: full URL → path → legacy combined → name search. */
export function supplementIHerbHref(s: Supplement): string {
  const n = displayName(s);
  if (s.iherbUrl?.trim()) return iHerbProductUrl(s.iherbUrl, n);
  if (s.iherbPath?.trim()) return iHerbProductUrl(s.iherbPath, n);
  if (s.iHerbUrlOrPath?.trim()) return iHerbProductUrl(s.iHerbUrlOrPath, n);
  return iHerbSearchUrl(n);
}

export function supplementIHerbSearchHref(s: Supplement): string {
  return iHerbSearchUrl(s.iHerbSearchTerm?.trim() || displayName(s));
}

export function supplementHasAmazonProductLink(s: Supplement): boolean {
  if (s.amazonUrl?.trim()) return true;
  if (s.amazonAsin?.trim()) return true;
  if (s.amazonUrlOrAsin?.trim() && looksLikeAmazonProductRef(s.amazonUrlOrAsin)) return true;
  return false;
}

export function supplementHasIHerbProductLink(s: Supplement): boolean {
  if (s.iherbUrl?.trim()) return true;
  if (s.iherbPath?.trim()) return true;
  if (s.iHerbUrlOrPath?.trim() && looksLikeIHerbProductRef(s.iHerbUrlOrPath)) return true;
  return false;
}
