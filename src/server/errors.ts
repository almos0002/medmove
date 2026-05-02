import { ZodError } from 'zod'

export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'INVALID_TRANSITION'
  | 'ORG_NOT_VERIFIED'
  | 'CONTROLLED_DRUG'
  | 'COLD_CHAIN_DRUG'
  | 'EXPIRED_MEDICINE'
  | 'OPENED_PACKAGE'
  | 'QUANTITY_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL'

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public detail?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export type ClientError = {
  code: AppErrorCode
  message: string
  detail?: unknown
}

export function toClientError(e: unknown): ClientError {
  if (e instanceof AppError) {
    return { code: e.code, message: e.message, detail: e.detail }
  }
  if (e instanceof ZodError) {
    return {
      code: 'VALIDATION',
      message: 'Invalid input',
      detail: e.flatten(),
    }
  }
  console.error('[unhandled-server-error]', e)
  return { code: 'INTERNAL', message: 'Something went wrong' }
}
