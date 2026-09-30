import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestJson, requestNoContent } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('requestJson', () => {
  it('returns successful JSON without changing the payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }))));
    await expect(requestJson('/test', {}, 'fallback')).resolves.toEqual({ items: [] });
  });

  it('exposes only the message from a backend error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: '요청에 실패했습니다.', code: 'INTERNAL', details: [{ field: 'secret' }],
    }), { status: 422 })));
    const error = await requestJson('/test', {}, 'fallback').catch((value: unknown) => value);
    expect(error).toMatchObject({ status: 422, message: '요청에 실패했습니다.' });
    expect(error).not.toHaveProperty('code');
    expect(error).not.toHaveProperty('details');
  });

  it('uses the endpoint fallback for a non-JSON error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })));
    await expect(requestJson('/test', {}, 'fallback')).rejects.toThrow('fallback');
  });

  it('does not display untranslated server diagnostics', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: 'Database internal failure' }), { status: 500 },
    )));
    await expect(requestJson('/test', {}, '서버 오류가 발생했습니다.'))
      .rejects.toThrow('서버 오류가 발생했습니다.');
  });

  it('explains a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(requestJson('/test', {}, 'fallback'))
      .rejects.toThrow('서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요.');
  });

  it('explains an unreadable success response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json')));
    await expect(requestJson('/test', {}, 'fallback'))
      .rejects.toThrow('서버 응답을 읽을 수 없습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.');
  });
});

describe('requestNoContent', () => {
  it('accepts a successful empty response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(requestNoContent('/test', { method: 'DELETE' }, 'fallback')).resolves.toBeUndefined();
  });

  it('uses a localized delete error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: '삭제할 결과를 찾을 수 없습니다.' }), { status: 404 },
    )));
    await expect(requestNoContent('/test', { method: 'DELETE' }, 'fallback'))
      .rejects.toThrow('삭제할 결과를 찾을 수 없습니다.');
  });
});
