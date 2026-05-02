import { useState } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import appCss from '../styles.css?url'
import { makeQueryClient } from '@/lib/query-client'
import { PageError } from '@/components/feedback/PageError'
import { NotFoundPage } from '@/components/feedback/NotFoundPage'
import { getPlatformSettings } from '@/server/functions/platformSettings'

export const Route = createRootRoute({
  loader: async () => {
    try {
      const { settings } = await getPlatformSettings()
      return {
        siteName: settings.siteName,
        announcementBanner: settings.announcementBanner,
      }
    } catch {
      return { siteName: 'MedMove', announcementBanner: '' }
    }
  },
  staleTime: 60_000,
  head: ({ loaderData }) => {
    const siteName = loaderData?.siteName ?? 'MedMove'
    const title = `${siteName} — Verified medicine redistribution`
    const description =
      'Verified B2B platform for redistributing surplus, in-date, sealed medicine between pharmacies, clinics, hospitals, NGOs and distributors.'
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title },
        { name: 'description', content: description },
        { name: 'theme-color', content: '#0f5c4a' },
        { name: 'application-name', content: siteName },
        { name: 'apple-mobile-web-app-title', content: siteName },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: siteName },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      links: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'apple-touch-icon', href: '/logo192.png' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossOrigin: 'anonymous',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap',
        },
        { rel: 'stylesheet', href: appCss },
      ],
    }
  },
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser instance. Server-side data is loaded via
  // route loaders, so we don't need SSR hydration of the cache here.
  const [queryClient] = useState(() => makeQueryClient())
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast:
                  'squircle-sm bg-white border border-[var(--color-mm-line-strong)] text-[var(--color-mm-ink)] no-shadow',
                title: 'font-medium',
                description: 'text-[var(--color-mm-muted)]',
              },
            }}
          />
        </QueryClientProvider>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
