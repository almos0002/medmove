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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'MedMove — Verified medicine redistribution' },
      {
        name: 'description',
        content:
          'Verified B2B platform for redistributing surplus, in-date, sealed medicine between healthcare organizations.',
      },
    ],
    links: [
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
  }),
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
