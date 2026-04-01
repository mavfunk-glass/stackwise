function encodeSearchTerm(searchTerm: string) {
  return encodeURIComponent(searchTerm.trim());
}

/** Amazon Associates tag. Set VITE_AMAZON_ASSOCIATE_TAG in env. */
export function getAmazonAssociateTag(): string | undefined {
  const raw = import.meta.env.VITE_AMAZON_ASSOCIATE_TAG;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  return raw.trim();
}

/** iHerb referral code. Set VITE_IHERB_RCODE in env. */
export function getIHerbRcode(): string | undefined {
  const raw = import.meta.env.VITE_IHERB_RCODE;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  return raw.trim();
}

export function amazonSearchUrl(searchTerm: string) {
  const encoded = encodeSearchTerm(searchTerm);
  const tag = getAmazonAssociateTag();
  const base = `https://www.amazon.com/s?k=${encoded}`;
  if (!tag) return base;
  return `${base}&tag=${encodeURIComponent(tag)}`;
}

export function iHerbSearchUrl(searchTerm: string) {
  const encoded = encodeSearchTerm(searchTerm);
  const base = `https://www.iherb.com/search?kw=${encoded}`;
  const rcode = getIHerbRcode();
  if (!rcode) return base;
  return `${base}&rcode=${encodeURIComponent(rcode)}`;
}

function isFullUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function looksLikeAmazonAsin(value: string) {
  return /^[A-Z0-9]{10}$/i.test(value.trim());
}

function withAmazonTag(url: string) {
  const tag = getAmazonAssociateTag();
  if (!tag) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('tag', tag);
    return parsed.toString();
  } catch {
    return url;
  }
}

function withIHerbRcode(url: string) {
  const rcode = getIHerbRcode();
  if (!rcode) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('rcode', rcode);
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Builds an Amazon product link from:
 * - full product URL
 * - ASIN
 * - fallback search term
 */
export function amazonProductUrl(urlOrAsin?: string, fallbackSearchTerm?: string) {
  const value = urlOrAsin?.trim();

  if (value) {
    if (isFullUrl(value)) {
      return withAmazonTag(value);
    }

    if (looksLikeAmazonAsin(value)) {
      return withAmazonTag(`https://www.amazon.com/dp/${value}`);
    }
  }

  return amazonSearchUrl(fallbackSearchTerm || '');
}

/**
 * Builds an iHerb product link from:
 * - full product URL
 * - path like /pr/brand/product/12345
 * - fallback search term
 */
export function iHerbProductUrl(urlOrPath?: string, fallbackSearchTerm?: string) {
  const value = urlOrPath?.trim();

  if (value) {
    if (isFullUrl(value)) {
      return withIHerbRcode(value);
    }

    if (value.startsWith('/')) {
      return withIHerbRcode(`https://www.iherb.com${value}`);
    }
  }

  return iHerbSearchUrl(fallbackSearchTerm || '');
}

/** True when a direct Amazon product URL/ASIN is present (matches `amazonProductUrl` behavior). */
export function looksLikeAmazonProductRef(urlOrAsin: string | undefined): boolean {
  const value = urlOrAsin?.trim();
  if (!value) return false;
  if (isFullUrl(value)) return true;
  return looksLikeAmazonAsin(value);
}

/** True when a direct iHerb URL or absolute path is present (matches `iHerbProductUrl` behavior). */
export function looksLikeIHerbProductRef(urlOrPath: string | undefined): boolean {
  const value = urlOrPath?.trim();
  if (!value) return false;
  if (isFullUrl(value)) return true;
  return value.startsWith('/');
}
