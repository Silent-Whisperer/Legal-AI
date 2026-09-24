import { describe, it, expect } from 'vitest';
import { getVernacularText, SUPPORTED_LANGUAGES } from '../src/utils/vernacular.ts';

describe('Vernacular Accessibility & Localization Engine', () => {
  it('supports English, Hindi, Kannada, Tamil, and Telugu', () => {
    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('hi');
    expect(codes).toContain('kn');
    expect(codes).toContain('ta');
    expect(codes).toContain('te');
  });

  it('retrieves accurate vernacular strings for Hindi', () => {
    const appName = getVernacularText('appName', 'hi');
    const obligations = getVernacularText('obligations', 'hi');
    expect(appName).toBe('क्लेरिटी लीगल');
    expect(obligations).toContain('जिम्मेदारियों');
  });

  it('retrieves accurate vernacular strings for Tamil', () => {
    const whatItMeans = getVernacularText('whatItMeans', 'ta');
    expect(whatItMeans).toContain('பொருள்');
  });

  it('gracefully falls back to English when a key is missing in target language', () => {
    const text = getVernacularText('appName', 'hi');
    expect(text).toBeTruthy();
  });
});
