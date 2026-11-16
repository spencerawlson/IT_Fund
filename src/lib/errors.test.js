import { describe, it, expect } from 'vitest';
import { isNetworkError, friendlyErrorMessage } from './errors';

describe('isNetworkError', () => {
  it('recognizes the fetch TypeError', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    const named = new Error('Failed to fetch');
    named.name = 'TypeError';
    expect(isNetworkError(named)).toBe(true);
  });

  it('does not treat other errors as network errors', () => {
    expect(isNetworkError(new Error('Lab session not found.'))).toBe(false);
    expect(isNetworkError(new Error('boom'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe('friendlyErrorMessage', () => {
  it('maps a network failure to plain language, never the raw TypeError text', () => {
    expect(friendlyErrorMessage(new TypeError('Failed to fetch')))
      .toBe('Could not reach the server — check your connection and try again.');
    expect(friendlyErrorMessage(new TypeError('Failed to fetch')))
      .not.toContain('Failed to fetch');
  });

  it('keeps a real error message verbatim', () => {
    expect(friendlyErrorMessage(new Error('Lab session not found.')))
      .toBe('Lab session not found.');
  });

  it('falls back when the error carries no message', () => {
    expect(friendlyErrorMessage(new Error(''))).toBe('Something went wrong. Please try again.');
    expect(friendlyErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(friendlyErrorMessage(null, { fallback: 'Command failed.' })).toBe('Command failed.');
  });

  it('lets a caller name the unreachable service', () => {
    expect(friendlyErrorMessage(new TypeError('Failed to fetch'), {
      network: 'The tutor couldn’t be reached. Check your connection and try again.',
    })).toBe('The tutor couldn’t be reached. Check your connection and try again.');
  });
});
