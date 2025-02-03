export const matchAndMap = <T, U>(
  entityIds: string[],
  sourceData: T[] | undefined,
  matchEntityCb: (id: string, entry: T) => boolean,
  mapCb: (entity: T) => U
) => {
  if (!sourceData || sourceData.length === 0) {
    return {};
  }

  // TODO remove the !
  return Object.fromEntries(entityIds.map((id) => [id, mapCb(sourceData.find((entry) => matchEntityCb(id, entry))!)]));
};
