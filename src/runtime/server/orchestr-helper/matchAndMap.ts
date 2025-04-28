const isEntry = (obj: any[] | undefined): obj is any[] => typeof obj !== 'undefined';

export const matchAndMap = <T, U>(
  entityIds: string[],
  sourceData: T[] | undefined,
  matchEntityCb: (id: string, entry: T) => boolean,
  mapCb: (entity: T) => U
) => {
  if (!sourceData || sourceData.length === 0) {
    return {};
  }

  return Object.fromEntries(
    entityIds
      .map((id) => {
        const rawEntity = sourceData.find((entry) => matchEntityCb(id, entry));
        if (!rawEntity) {
          return undefined;
        }
        return [id, mapCb(rawEntity)];
      })
      .filter(isEntry)
  );
};
