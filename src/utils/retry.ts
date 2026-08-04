/**
 * M1-T05 — retry/backoff + offline detection for LACRM write-through calls.
 *
 * PRINCIPLE-01 ("LACRM wins") means a write SalesForge can't actually confirm
 * happened must never be presented as if it did. This module gives every
 * write path in lacrmStore.ts the same policy: retry a failed call a few
 * times with growing delays, but fail fast (no retries) when the browser is
 * already known to be offline, and always surface which of the two happened
 * to the caller via a typed error so the store can revert local state
 * instead of leaving an unconfirmed optimistic edit on screen.
 */

/** Thrown instead of the underlying network error when the browser is offline at attempt time. */
export class OfflineError extends Error {
  constructor() {
    super("You're offline. This change was not saved to LACRM.")
    this.name = 'OfflineError'
  }
}

/**
 * Thrown when every retry attempt failed. `.message` is deliberately plain-language (PRINCIPLE-02
 * — Tim is non-technical) rather than echoing the raw underlying error; `.cause` keeps that
 * original error attached for anyone debugging, but callers should not show `.cause` to the user.
 */
export class RetryExhaustedError extends Error {
  constructor(public readonly attempts: number, public readonly cause: unknown) {
    super("LACRM couldn't be reached after several tries. This change was not saved — please try again.")
    this.name = 'RetryExhaustedError'
  }
}

/** `navigator.onLine` is undefined in non-browser contexts (e.g. tests without jsdom's default) —
 *  treat "unknown" as online so it never blocks a call that would otherwise be attempted. */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface RetryOptions {
  /** Total attempts including the first, before giving up. Default 4 (1 try + 3 retries). */
  attempts?: number
  /** Delay before the 2nd attempt; doubles each attempt after (capped at maxDelayMs). Default 500ms. */
  baseDelayMs?: number
  /** Upper bound on any single delay. Default 8000ms. */
  maxDelayMs?: number
  /** Called before each retry delay (not before the first attempt). Useful for UI/announcements. */
  onRetry?: (attempt: number, delayMs: number) => void
}

/**
 * Runs `fn`, retrying on failure with exponential backoff. Checks online state before every
 * attempt (including the first) — if offline, throws OfflineError immediately without spending
 * a retry or a network round trip. If all attempts fail while online, throws RetryExhaustedError
 * wrapping the last error.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 4
  const baseDelayMs = opts.baseDelayMs ?? 500
  const maxDelayMs = opts.maxDelayMs ?? 8000

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (!isOnline()) throw new OfflineError()
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === attempts) break
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)
      opts.onRetry?.(attempt, delay)
      await sleep(delay)
    }
  }
  throw new RetryExhaustedError(attempts, lastError)
}
