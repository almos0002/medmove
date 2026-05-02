import { useLoaderData } from '@tanstack/react-router'

export function useSiteName(): string {
  try {
    const data = useLoaderData({ from: '__root__' }) as
      | { siteName?: string }
      | undefined
    return data?.siteName || 'MedMove'
  } catch {
    return 'MedMove'
  }
}
