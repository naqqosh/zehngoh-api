import type { Response } from 'express'

const defaultTtlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30)
const secure = process.env.NODE_ENV === 'production'
const sameSite: 'lax' | 'strict' = 'lax'
const path = '/api'

export const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'zg_refresh_token'
export const REFRESH_TOKEN_MAX_AGE_MS = defaultTtlDays * 24 * 60 * 60 * 1000

export function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite,
    path,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  })
}

export function clearRefreshTokenCookie(res: Response) {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    secure,
    sameSite,
    path,
    maxAge: 0,
  })
}
