import { describe, it, expect } from 'vitest'
import { replaceDripVariables, parseDuration } from './drip-cron-utils'

describe('replaceDripVariables', () => {
  it('replaces single variable', () => {
    expect(replaceDripVariables('Hello {{name}}', { name: 'World' })).toBe(
      'Hello World'
    )
  })

  it('replaces multiple variables', () => {
    expect(
      replaceDripVariables('{{greeting}}, {{name}}!', {
        greeting: 'Hi',
        name: 'Alex',
      })
    ).toBe('Hi, Alex!')
  })

  it('leaves unknown placeholders unchanged', () => {
    const out = replaceDripVariables('Hello {{name}}', {})
    expect(out).toBe('Hello {{name}}')
  })

  it('handles empty template', () => {
    expect(replaceDripVariables('', { name: 'X' })).toBe('')
  })

  it('handles missing value as empty string', () => {
    expect(replaceDripVariables('{{a}}', { a: '' })).toBe('')
  })
})

describe('parseDuration', () => {
  it('parses minutes', () => {
    expect(parseDuration('30m')).toBe(30 * 60 * 1000)
    expect(parseDuration('1m')).toBe(60 * 1000)
  })

  it('parses hours', () => {
    expect(parseDuration('24h')).toBe(24 * 60 * 60 * 1000)
    expect(parseDuration('2h')).toBe(2 * 60 * 60 * 1000)
  })

  it('parses days', () => {
    expect(parseDuration('1d')).toBe(24 * 60 * 60 * 1000)
    expect(parseDuration('3d')).toBe(3 * 24 * 60 * 60 * 1000)
  })

  it('is case insensitive', () => {
    expect(parseDuration('1D')).toBe(24 * 60 * 60 * 1000)
    expect(parseDuration('2H')).toBe(2 * 60 * 60 * 1000)
  })

  it('trims whitespace', () => {
    expect(parseDuration('  1d  ')).toBe(24 * 60 * 60 * 1000)
  })

  it('returns 24h default for invalid format', () => {
    expect(parseDuration('')).toBe(24 * 60 * 60 * 1000)
    expect(parseDuration('nope')).toBe(24 * 60 * 60 * 1000)
    expect(parseDuration('1x')).toBe(24 * 60 * 60 * 1000)
  })
})
