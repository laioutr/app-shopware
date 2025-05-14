export const swTranslatedRaw = (rawEntity: any, key: PropertyKey) => rawEntity?.translated?.[key] ?? rawEntity?.[key];

type SwTranslatable = { translated?: any };
type SwTranslatableKeys<TEntity extends SwTranslatable> = keyof Exclude<TEntity['translated'], undefined>;

export function swTranslated<TEntity extends SwTranslatable, TKey extends SwTranslatableKeys<TEntity> & keyof TEntity>(
  rawEntity: TEntity | undefined,
  key: TKey & keyof TEntity
): TEntity[TKey] {
  return swTranslatedRaw(rawEntity, key);
}
