import { describe, expect, it } from 'vitest';
import { categoryTrailIds } from './categoryTrail';

const entryPoints = ['main-root', 'service-root', 'footer-root'];

describe('categoryTrailIds', () => {
  it('starts below the navigation root and ends with the category itself', () => {
    const category = { id: 'eckbaenke', path: '|main-root|moebel|baenke|esszimmerbaenke|' };

    expect(categoryTrailIds(category, entryPoints)).toEqual(['moebel', 'baenke', 'esszimmerbaenke', 'eckbaenke']);
  });

  it('is the category alone for a category directly below the navigation root', () => {
    expect(categoryTrailIds({ id: 'moebel', path: '|main-root|' }, entryPoints)).toEqual(['moebel']);
  });

  it('starts below the service or footer root for a category in those trees', () => {
    expect(categoryTrailIds({ id: 'imprint', path: '|service-root|legal|' }, entryPoints)).toEqual(['legal', 'imprint']);
    expect(categoryTrailIds({ id: 'faq', path: '|footer-root|' }, entryPoints)).toEqual(['faq']);
  });

  it('starts below the first listed entry point when the path passes through several', () => {
    const category = { id: 'sale', path: '|footer-root|main-root|campaigns|' };

    expect(categoryTrailIds(category, entryPoints)).toEqual(['campaigns', 'sale']);
  });

  it('is empty for an entry point itself', () => {
    expect(categoryTrailIds({ id: 'main-root' }, entryPoints)).toEqual([]);
  });

  it('is the whole path for a category outside every entry point', () => {
    expect(categoryTrailIds({ id: 'orphan', path: '|other-root|archive|' }, entryPoints)).toEqual(['other-root', 'archive', 'orphan']);
  });
});
