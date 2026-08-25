// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrderHandoffRefresher } from './createOrderHandoffRefresher';

const setup = (mint: () => Promise<string | null>) => {
  const deliver = vi.fn();
  const refresher = createOrderHandoffRefresher({ mint, deliver, intervalMs: 1000 });
  return { refresher, deliver };
};

describe('createOrderHandoffRefresher', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('delivers a code immediately on start, then on every interval', async () => {
    let n = 0;
    const { refresher, deliver } = setup(async () => `code-${++n}`);

    refresher.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(deliver).toHaveBeenNthCalledWith(1, 'code-1');

    await vi.advanceTimersByTimeAsync(2000);
    expect(deliver).toHaveBeenNthCalledWith(2, 'code-2');
    expect(deliver).toHaveBeenNthCalledWith(3, 'code-3');
  });

  it('stops minting after stop', async () => {
    const { refresher, deliver } = setup(async () => 'code');

    refresher.start();
    await vi.advanceTimersByTimeAsync(0);
    refresher.stop();
    await vi.advanceTimersByTimeAsync(5000);

    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it('re-mints when started again, so a re-rendered confirm page is not left without a code', async () => {
    let n = 0;
    const { refresher, deliver } = setup(async () => `code-${++n}`);

    refresher.start();
    await vi.advanceTimersByTimeAsync(0);
    refresher.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(deliver).toHaveBeenCalledTimes(2);
    expect(deliver).toHaveBeenLastCalledWith('code-2');
  });

  it('delivers nothing when a mint fails, leaving the previous code in place', async () => {
    const { refresher, deliver } = setup(async () => null);

    refresher.start();
    await vi.advanceTimersByTimeAsync(3000);

    expect(deliver).not.toHaveBeenCalled();
  });
});
