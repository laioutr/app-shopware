// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseBridgeMessage } from './parseBridgeMessage';
import { BRIDGE_SOURCE, BRIDGE_VERSION } from '../const/bridge';

const envelope = (type: string, payload: unknown = {}) => ({
  source: BRIDGE_SOURCE,
  version: BRIDGE_VERSION,
  type,
  payload,
});

describe('parseBridgeMessage', () => {
  it('accepts the contentless ready ping', () => {
    expect(parseBridgeMessage(envelope('laioutr:ready'))).toEqual({ type: 'laioutr:ready', payload: {} });
  });

  it('accepts pw-recovery', () => {
    expect(parseBridgeMessage(envelope('laioutr:pw-recovery'))).toEqual({ type: 'laioutr:pw-recovery', payload: {} });
  });

  it('accepts resize with a numeric height', () => {
    expect(parseBridgeMessage(envelope('laioutr:resize', { height: 812 }))).toEqual({
      type: 'laioutr:resize',
      payload: { height: 812 },
    });
  });

  it('accepts checkout-finish with a string orderId', () => {
    expect(parseBridgeMessage(envelope('laioutr:checkout-finish', { orderId: 'ord_1' }))).toEqual({
      type: 'laioutr:checkout-finish',
      payload: { orderId: 'ord_1' },
    });
  });

  it('accepts page-loaded and defaults missing optional fields to null', () => {
    expect(parseBridgeMessage(envelope('laioutr:page-loaded', { path: '/checkout' }))).toEqual({
      type: 'laioutr:page-loaded',
      payload: { path: '/checkout', route: null, navigationId: null, salesChannelId: null },
    });
  });

  it('rejects a wrong source', () => {
    expect(parseBridgeMessage({ ...envelope('laioutr:ready'), source: 'evil' })).toBeNull();
  });

  it('rejects a wrong version', () => {
    expect(parseBridgeMessage({ ...envelope('laioutr:ready'), version: 999 })).toBeNull();
  });

  it('rejects an unknown type', () => {
    expect(parseBridgeMessage(envelope('laioutr:unknown'))).toBeNull();
  });

  it('rejects resize without a numeric height', () => {
    expect(parseBridgeMessage(envelope('laioutr:resize', { height: '812' }))).toBeNull();
    expect(parseBridgeMessage(envelope('laioutr:resize', {}))).toBeNull();
  });

  it('rejects checkout-finish without a string orderId', () => {
    expect(parseBridgeMessage(envelope('laioutr:checkout-finish', { orderId: 42 }))).toBeNull();
    expect(parseBridgeMessage(envelope('laioutr:checkout-finish', {}))).toBeNull();
  });

  it('rejects non-object data', () => {
    expect(parseBridgeMessage(null)).toBeNull();
    expect(parseBridgeMessage(undefined)).toBeNull();
    expect(parseBridgeMessage('laioutr:ready')).toBeNull();
    expect(parseBridgeMessage(7)).toBeNull();
  });

  it('accepts auth-changed with a from and optional code', () => {
    expect(parseBridgeMessage(envelope('laioutr:auth-changed', { from: 'frontend.account.login', code: 'abc' }))).toEqual({
      type: 'laioutr:auth-changed',
      payload: { from: 'frontend.account.login', code: 'abc' },
    });
  });

  it('accepts auth-changed without a code (logout)', () => {
    expect(parseBridgeMessage(envelope('laioutr:auth-changed', { from: 'frontend.account.logout' }))).toEqual({
      type: 'laioutr:auth-changed',
      payload: { from: 'frontend.account.logout' },
    });
  });

  it('rejects auth-changed without a string from', () => {
    expect(parseBridgeMessage(envelope('laioutr:auth-changed', { code: 'abc' }))).toBeNull();
    expect(parseBridgeMessage(envelope('laioutr:auth-changed', { from: 42 }))).toBeNull();
  });

  it('drops a non-string code from auth-changed', () => {
    expect(parseBridgeMessage(envelope('laioutr:auth-changed', { from: 'frontend.account.login', code: 7 }))).toEqual({
      type: 'laioutr:auth-changed',
      payload: { from: 'frontend.account.login' },
    });
  });
});
