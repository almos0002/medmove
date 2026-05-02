/**
 * Per-route SEO helper. TanStack Router's `head()` runs at config time,
 * so we can't read the dynamic `siteName` from the root loader here.
 * Page titles use a hardcoded "MedMove" suffix as a stable fallback;
 * the runtime UI brand is still driven by `useSiteName()` everywhere.
 *
 * Usage:
 *   head: pageHead({ title: 'Marketplace', description: '…' })
 *   head: pageHead({ title: 'Admin · Listings', noindex: true })
 */
type PageHeadOptions = {
  title: string
  description?: string
  /** Defaults to true for any route invoked through this helper that
   *  isn't explicitly marked `noindex: false`. Most app routes are
   *  signed-in surfaces that shouldn't appear in search results. */
  noindex?: boolean
  /** Public marketing pages can opt-in to OpenGraph cards. */
  ogImage?: string
}

const BRAND = 'MedMove'

export function pageHead(opts: PageHeadOptions) {
  const noindex = opts.noindex ?? true
  const fullTitle = `${opts.title} · ${BRAND}`
  return () => {
    const meta: Array<Record<string, string>> = [{ title: fullTitle }]
    if (opts.description) {
      meta.push({ name: 'description', content: opts.description })
      meta.push({ property: 'og:description', content: opts.description })
      meta.push({ name: 'twitter:description', content: opts.description })
    }
    meta.push({ property: 'og:title', content: fullTitle })
    meta.push({ name: 'twitter:title', content: fullTitle })
    if (opts.ogImage) {
      meta.push({ property: 'og:image', content: opts.ogImage })
      meta.push({ name: 'twitter:image', content: opts.ogImage })
      meta.push({ name: 'twitter:card', content: 'summary_large_image' })
    }
    if (noindex) {
      meta.push({ name: 'robots', content: 'noindex,nofollow' })
    } else {
      meta.push({ name: 'robots', content: 'index,follow' })
    }
    return { meta }
  }
}
