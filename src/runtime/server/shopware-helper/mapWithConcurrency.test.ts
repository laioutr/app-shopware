import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './mapWithConcurrency';

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

describe('mapWithConcurrency', () => {
  it('answers in the order of the items, whatever order the calls finish in', async () => {
    const results = await mapWithConcurrency([30, 10, 20], 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms * 2;
    });

    expect(results).toEqual([60, 20, 40]);
  });

  it('keeps at most the limit in flight', async () => {
    let running = 0;
    let peak = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      running++;
      peak = Math.max(peak, running);
      await tick();
      running--;
    });

    expect(peak).toBe(3);
  });

  it('answers an empty list without calling', async () => {
    let calls = 0;
    await expect(mapWithConcurrency([], 4, async () => calls++)).resolves.toEqual([]);
    expect(calls).toBe(0);
  });
});
