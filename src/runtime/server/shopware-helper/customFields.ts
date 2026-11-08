import { consola } from 'consola';
import { swTranslatedRaw } from './swTranslated';
import type { ShopwareCriteria, ShopwareCriteriaTarget } from '../types/criteria';
import type { CustomFieldsConfig, CustomFieldsEntity } from '../types/customFields';

const logger = consola.withTag('shopware/custom-fields');

const escapeRegExp = (value: string) => value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

type CustomFieldMatcher = (key: string) => boolean;

// Keyed by the array itself: it is the runtime config's, frozen and shared by every request, so its
// globs compile once rather than per product of a listing.
const matchers = new WeakMap<string[], CustomFieldMatcher>();

/** `*` matches any run of characters, so `gpsr_*` takes a whole custom-field set. */
export const customFieldMatcher = (include: string[]): CustomFieldMatcher => {
  const known = matchers.get(include);
  if (known) return known;

  const exact = new Set(include.filter((pattern) => !pattern.includes('*')));
  const globs = include
    .filter((pattern) => pattern.includes('*'))
    .map((pattern) => new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`));

  const matcher: CustomFieldMatcher = (key) => exact.has(key) || globs.some((glob) => glob.test(key));
  matchers.set(include, matcher);
  return matcher;
};

// The config is the same on every request, so each entity's misconfiguration is reported once.
const warnedEntities = new Set<CustomFieldsEntity>();

/**
 * The entity's whitelist. One that is not a list of names, as a form's free JSON can hold, exposes
 * nothing for that entity rather than failing every read of it.
 */
const includeFor = (config: CustomFieldsConfig | undefined, entity: CustomFieldsEntity): string[] => {
  const include: unknown = config?.[entity]?.include;
  if (include === undefined) return [];
  if (Array.isArray(include) && include.every((pattern) => typeof pattern === 'string')) return include;

  if (!warnedEntities.has(entity)) {
    warnedEntities.add(entity);
    logger.warn(`customFields.${entity}.include is not a list of field names, so no ${entity} custom field is exposed`, { include });
  }
  return [];
};

/**
 * The whitelisted custom fields of a Shopware entity, read from `translated` so a field without a
 * value in the visitor's language falls back the way Shopware's own storefront does; an entity
 * Shopware does not translate, a customer, has only the column. Undefined while the entity has
 * nothing whitelisted, so an unconfigured shop sends no empty object.
 */
export const pickCustomFields = (
  rawEntity: unknown,
  config: CustomFieldsConfig | undefined,
  entity: CustomFieldsEntity
): Record<string, unknown> | undefined => {
  const include = includeFor(config, entity);
  if (include.length === 0) return undefined;

  const raw = swTranslatedRaw(rawEntity, 'customFields');
  if (!raw || typeof raw !== 'object') return {};

  const matches = customFieldMatcher(include);
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([key]) => matches(key)));
};

/** Per read, the Shopware entity whose `includes` it projects and the whitelists its rows are mapped with. */
const PROJECTION_BY_TARGET: Partial<Record<ShopwareCriteriaTarget, { entity: string; whitelists: CustomFieldsEntity[] }>> = {
  product: { entity: 'product', whitelists: ['product', 'variant'] },
  'product-variant': { entity: 'product', whitelists: ['variant'] },
  category: { entity: 'category', whitelists: ['category'] },
};

/**
 * Shopware returns `customFields` as one JSON column, so the projection names the column and the
 * whitelist is applied when mapping. A read that projects nothing returns whole rows and is left as
 * it is. Applied after `shopware:criteria:resolve`: the whitelist is configuration, so a handler that
 * narrows `includes` cannot drop the column, and never sees it.
 */
export const withCustomFieldIncludes = (
  target: ShopwareCriteriaTarget,
  criteria: ShopwareCriteria,
  config: CustomFieldsConfig | undefined
): ShopwareCriteria => {
  const projection = PROJECTION_BY_TARGET[target];
  if (!projection?.whitelists.some((entity) => includeFor(config, entity).length > 0)) return criteria;

  const fields = criteria.includes[projection.entity];
  if (!fields || fields.includes('customFields')) return criteria;

  return { ...criteria, includes: { ...criteria.includes, [projection.entity]: [...fields, 'customFields'] } };
};
