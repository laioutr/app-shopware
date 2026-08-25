/** Re-mint well inside the storefront's ~60s code lifetime, leaving room for the submit itself. */
const DEFAULT_INTERVAL_MS = 40_000;

export type CreateOrderHandoffRefresherOptions = {
  /** Mint a fresh single-use code, or resolve `null` when the mint failed. */
  mint: () => Promise<string | null>;
  /** Hand a freshly minted code to the storefront frame. */
  deliver: (code: string) => void;
  /** Overrides the re-mint cadence; must stay under the storefront's code lifetime. */
  intervalMs?: number;
};

/**
 * Keeps a fresh order-handoff code in the storefront frame for as long as the shopper sits on
 * the confirm page.
 *
 * A code cannot be minted at submit time: minting is a round trip, and awaiting it inside the
 * click handler outlives the transient user activation the top-level form submit depends on.
 * Minting once on page load does not work either, since a shopper reading the terms outlives
 * the code. So mint on a cadence and let the frame hold the newest one.
 *
 * Failures are swallowed by design — the frame keeps the previous code, and leaves the form
 * submitting in-frame if it never received one.
 */
export const createOrderHandoffRefresher = (options: CreateOrderHandoffRefresherOptions) => {
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = (): void => {
    options
      .mint()
      .then((code) => {
        if (code) options.deliver(code);
      })
      .catch(() => {
        // A failed mint leaves the previously delivered code in place; see above.
      });
  };

  const stop = (): void => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };

  /**
   * Restarts rather than no-ops when already running: the confirm page re-renders on a form
   * validation error, and the fresh DOM holds no code until one is delivered again.
   */
  const start = (): void => {
    stop();
    tick();
    timer = setInterval(tick, options.intervalMs ?? DEFAULT_INTERVAL_MS);
  };

  return { start, stop };
};
