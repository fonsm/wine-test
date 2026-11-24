import { describe, expect, it } from 'vitest';
import {
  LANGUAGE_STORAGE_KEY,
  initialLanguage,
  readStoredLanguage,
  storeLanguage,
} from './storage';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

const blockedStorage = {
  getItem: (): string | null => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('language storage', () => {
  it('stores only the language code under one key', () => {
    const storage = memoryStorage();
    storeLanguage(storage, 'de');
    expect([...storage.data]).toEqual([[LANGUAGE_STORAGE_KEY, 'de']]);
  });

  it('reads a stored language', () => {
    expect(readStoredLanguage(memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'de' }))).toBe('de');
    expect(readStoredLanguage(memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'en' }))).toBe('en');
  });

  it('ignores missing or unknown values', () => {
    expect(readStoredLanguage(memoryStorage())).toBeNull();
    expect(readStoredLanguage(memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'fr' }))).toBeNull();
    expect(readStoredLanguage(memoryStorage({ [LANGUAGE_STORAGE_KEY]: '<b>' }))).toBeNull();
  });

  it('keeps working when storage is blocked (private mode, disabled site data)', () => {
    expect(readStoredLanguage(blockedStorage)).toBeNull();
    expect(() => {
      storeLanguage(blockedStorage, 'de');
    }).not.toThrow();
    expect(readStoredLanguage(null)).toBeNull();
    expect(() => {
      storeLanguage(null, 'de');
    }).not.toThrow();
  });
});

describe('initialLanguage', () => {
  it('prefers the stored choice over the browser language', () => {
    expect(initialLanguage(memoryStorage({ [LANGUAGE_STORAGE_KEY]: 'en' }), ['de-DE'])).toBe('en');
  });

  it('falls back to the browser language', () => {
    expect(initialLanguage(memoryStorage(), ['de-AT'])).toBe('de');
    expect(initialLanguage(blockedStorage, ['fr', 'en'])).toBe('en');
  });
});
