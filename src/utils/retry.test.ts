/**
 * M1-T05 — proves the retry/backoff policy every LACRM write goes through:
 * exponential delays, giving up after the configured attempt count, and
 * failing fast (no network call, no delay) when the browser is offline.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry, isOnline, OfflineError, RetryExhaustedError } from './retry'

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
}

describe('isOnline', () => {
  afterEach(() => setOnline(true))

  it('reflects navigator.onLine', () => {
    setOnline(false)
    expect(isOnline()).toBe(false)
    setOnline(true)
    expect(isOnline()).toBe(true)
  })
})

describe('withRetry', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    setOnline(true)
  })

  it('returns the result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(withRetry(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries with exponential backoff and succeeds once the call recovers', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok')
    const onRetry = vi.fn()

    const promise = withRetry(fn, { baseDelayMs: 100, onRetry })
    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
    // Doubles each attempt: 100ms before the 2nd try, 200ms before the 3rd.
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100)
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200)
  })

  it('caps the delay at maxDelayMs', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok')
    const onRetry = vi.fn()
    const promise = withRetry(fn, { baseDelayMs: 1000, maxDelayMs: 1500, attempts: 2, onRetry })
    await vi.runAllTimersAsync()
    await promise
    expect(onRetry).toHaveBeenCalledWith(1, 1000)
  })

  it('throws RetryExhaustedError with a plain-language message after exhausting all attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('LACRM is down'))
    const promise = withRetry(fn, { attempts: 3, baseDelayMs: 10 })
    const assertion = expect(promise).rejects.toBeInstanceOf(RetryExhaustedError)
    await vi.runAllTimersAsync()
    await assertion
    expect(fn).toHaveBeenCalledTimes(3)

    // The message must not read as a stack trace or raw fetch error — Tim is non-technical.
    await promise.catch((err: RetryExhaustedError) => {
      expect(err.message).not.toMatch(/boom|LACRM is down|fetch/i)
      expect(err.cause).toBeInstanceOf(Error)
    })
  })

  it('fails fast with OfflineError and never calls fn when offline', async () => {
    setOnline(false)
    const fn = vi.fn().mockResolvedValue('ok')
    await expect(withRetry(fn)).rejects.toBeInstanceOf(OfflineError)
    expect(fn).not.toHaveBeenCalled()
  })
})
