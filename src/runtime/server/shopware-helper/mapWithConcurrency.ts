/** `Promise.all(items.map(fn))` with at most `limit` calls in flight, answering in the order of `items`. */
export const mapWithConcurrency = async <T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  };

  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
};
