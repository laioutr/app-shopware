import { describe, expect, it } from 'vitest';
import { categoryTrailIds } from './categoryTrail';

const roots = { navigation: 'main-root', service: 'service-root', footer: 'footer-root' };

describe('categoryTrailIds', () => {
  it('starts below the navigation root and ends with the category itself', () => {
    const category = { id: 'eckbaenke', path: '|main-root|moebel|baenke|esszimmerbaenke|' };

    expect(categoryTrailIds(category, roots)).toEqual(['moebel', 'baenke', 'esszimmerbaenke', 'eckbaenke']);
  });

  it('is the category alone for a category directly below the navigation root', () => {
    expect(categoryTrailIds({ id: 'moebel', path: '|main-root|' }, roots)).toEqual(['moebel']);
  });

  it('starts below the service or footer root for a category in those trees', () => {
    expect(categoryTrailIds({ id: 'imprint', path: '|service-root|legal|' }, roots)).toEqual(['legal', 'imprint']);
    expect(categoryTrailIds({ id: 'faq', path: '|footer-root|' }, roots)).toEqual(['faq']);
  });

  it('prefers the navigation root over the service and footer roots when the path passes through several', () => {
    const category = { id: 'sale', path: '|footer-root|main-root|campaigns|' };

    expect(categoryTrailIds(category, roots)).toEqual(['campaigns', 'sale']);
  });

  it('is empty for a root itself', () => {
    expect(categoryTrailIds({ id: 'main-root' }, roots)).toEqual([]);
  });

  it('is the whole path while the roots are unknown', () => {
    expect(categoryTrailIds({ id: 'moebel', path: '|main-root|' }, undefined)).toEqual(['main-root', 'moebel']);
  });

  it('is the whole path for a category outside every root', () => {
    expect(categoryTrailIds({ id: 'orphan', path: '|other-root|archive|' }, roots)).toEqual(['other-root', 'archive', 'orphan']);
  });
});
