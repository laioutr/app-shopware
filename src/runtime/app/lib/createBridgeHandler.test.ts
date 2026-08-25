// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createBridgeHandler, type CreateBridgeHandlerOptions } from './createBridgeHandler';
import { BRIDGE_SOURCE, BRIDGE_VERSION } from '../const/bridge';

const STOREFRONT = 'https://shop.example.com';

const setup = (overrides: Partial<CreateBridgeHandlerOptions> = {}) => {
  const frameWindow = {} as Window;
  const options = {
    getFrameWindow: () => frameWindow,
    storefrontOrigin: STOREFRONT,
    postInit: vi.fn(),
    postOrderHandoff: vi.fn(),
    onResize: vi.fn(),
    onPageLoaded: vi.fn(),
    onCheckoutFinish: vi.fn(),
    onPwRecovery: vi.fn(),
    onAuthChanged: vi.fn(),
    ...overrides,
  } satisfies CreateBridgeHandlerOptions;
  const { handleMessage, sendInit, sendOrderHandoff } = createBridgeHandler(options);
  const emit = (type: string, payload: unknown = {}, from: { source?: unknown; origin?: string } = {}) =>
    handleMessage({
      source: 'source' in from ? from.source : frameWindow,
      origin: from.origin ?? STOREFRONT,
      data: { source: BRIDGE_SOURCE, version: BRIDGE_VERSION, type, payload },
    });
  return { options, frameWindow, emit, sendInit, sendOrderHandoff };
};

describe('createBridgeHandler', () => {
  it('replies laioutr:init to the validated origin on ready', () => {
    const { options, frameWindow, emit } = setup();
    emit('laioutr:ready');
    expect(options.postInit).toHaveBeenCalledWith(frameWindow, STOREFRONT);
  });

  it('forwards resize / page-loaded / checkout-finish / pw-recovery payloads', () => {
    const { options, emit } = setup();
    emit('laioutr:resize', { height: 640 });
    emit('laioutr:page-loaded', { path: '/checkout' });
    emit('laioutr:checkout-finish', { orderId: 'ord_9' });
    emit('laioutr:pw-recovery');
    expect(options.onResize).toHaveBeenCalledWith(640);
    expect(options.onPageLoaded).toHaveBeenCalledWith({
      path: '/checkout',
      route: null,
      navigationId: null,
      salesChannelId: null,
      returnFallback: false,
    });
    expect(options.onCheckoutFinish).toHaveBeenCalledWith('ord_9');
    expect(options.onPwRecovery).toHaveBeenCalledTimes(1);
  });

  it('forwards auth-changed payloads', () => {
    const { options, emit } = setup();
    emit('laioutr:auth-changed', { from: 'frontend.account.login', code: 'abc' });
    emit('laioutr:auth-changed', { from: 'frontend.account.logout' });
    expect(options.onAuthChanged).toHaveBeenNthCalledWith(1, { from: 'frontend.account.login', code: 'abc' });
    expect(options.onAuthChanged).toHaveBeenNthCalledWith(2, { from: 'frontend.account.logout' });
  });

  it('ignores messages from a window that is not our frame', () => {
    const { options, emit } = setup();
    emit('laioutr:resize', { height: 640 }, { source: {} });
    expect(options.onResize).not.toHaveBeenCalled();
  });

  it('ignores messages from an untrusted origin', () => {
    const { options, emit } = setup();
    emit('laioutr:ready', {}, { origin: 'https://evil.example.com' });
    emit('laioutr:resize', { height: 640 }, { origin: 'https://evil.example.com' });
    expect(options.postInit).not.toHaveBeenCalled();
    expect(options.onResize).not.toHaveBeenCalled();
  });

  it('ignores everything before the frame window exists', () => {
    const { options, emit } = setup({ getFrameWindow: () => null });
    emit('laioutr:resize', { height: 640 });
    expect(options.onResize).not.toHaveBeenCalled();
  });

  it('ignores a malformed envelope', () => {
    const { options, frameWindow } = setup();
    const { handleMessage } = createBridgeHandler(options);
    handleMessage({ source: frameWindow, origin: STOREFRONT, data: { source: 'evil', type: 'laioutr:resize' } });
    expect(options.onResize).not.toHaveBeenCalled();
  });

  it('handshake then resize flows end to end', () => {
    const { options, emit } = setup();
    emit('laioutr:ready');
    emit('laioutr:resize', { height: 900 });
    expect(options.postInit).toHaveBeenCalledTimes(1);
    expect(options.onResize).toHaveBeenCalledWith(900);
  });

  describe('sendInit (proactive handshake)', () => {
    it('posts init to the configured origin when the frame is present', () => {
      const { options, frameWindow, sendInit } = setup();
      sendInit();
      expect(options.postInit).toHaveBeenCalledWith(frameWindow, STOREFRONT);
    });

    it('no-ops before the frame window exists', () => {
      const { options, sendInit } = setup({ getFrameWindow: () => null });
      sendInit();
      expect(options.postInit).not.toHaveBeenCalled();
    });

    it('no-ops when the storefront origin is not configured', () => {
      const { options, sendInit } = setup({ storefrontOrigin: '' });
      sendInit();
      expect(options.postInit).not.toHaveBeenCalled();
    });
  });

  describe('sendOrderHandoff', () => {
    it('posts the code to the configured origin', () => {
      const { options, frameWindow, sendOrderHandoff } = setup();
      sendOrderHandoff('handoff-code');
      expect(options.postOrderHandoff).toHaveBeenCalledWith(frameWindow, STOREFRONT, 'handoff-code');
    });

    it('no-ops before the frame window exists', () => {
      const { options, sendOrderHandoff } = setup({ getFrameWindow: () => null });
      sendOrderHandoff('handoff-code');
      expect(options.postOrderHandoff).not.toHaveBeenCalled();
    });

    it('no-ops when the storefront origin is not configured', () => {
      const { options, sendOrderHandoff } = setup({ storefrontOrigin: '' });
      sendOrderHandoff('handoff-code');
      expect(options.postOrderHandoff).not.toHaveBeenCalled();
    });
  });
});
