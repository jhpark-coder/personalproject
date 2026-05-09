import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  choosePreferredKoreanVoice,
  SpeechQueueController,
  type SpeechEngine,
} from './speechQueue';

class DeferredEngine implements SpeechEngine {
  readonly spoken: string[] = [];
  private readonly pendingResolvers: Array<() => void> = [];

  cancel() {
    this.pendingResolvers.length = 0;
  }

  speak(text: string): Promise<void> {
    this.spoken.push(text);
    return new Promise<void>((resolve) => {
      this.pendingResolvers.push(resolve);
    });
  }

  resolveNext() {
    const resolver = this.pendingResolvers.shift();
    resolver?.();
  }
}

describe('speechQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-12T00:00:00+09:00'));
  });

  it('replaces queued feedback with the latest message', async () => {
    const engine = new DeferredEngine();
    const queue = new SpeechQueueController(engine);

    queue.enqueue({ text: '첫 번째 안내', channel: 'feedback' });
    queue.enqueue({ text: '곧 바꿔질 안내', channel: 'feedback', replacePending: true });
    queue.enqueue({ text: '최종 안내', channel: 'feedback', replacePending: true });

    await vi.runAllTimersAsync();
    expect(engine.spoken).toEqual(['첫 번째 안내']);

    engine.resolveNext();
    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(engine.spoken).toEqual(['첫 번째 안내', '최종 안내']);
  });

  it('keeps count announcements in order while deduping repeated feedback', async () => {
    const engine = new DeferredEngine();
    const queue = new SpeechQueueController(engine);

    queue.enqueue({ text: '좋아요, 자세 유지', channel: 'feedback', dedupeMs: 1000 });
    queue.enqueue({ text: '좋아요, 자세 유지', channel: 'feedback', dedupeMs: 1000 });
    queue.enqueue({ text: '1회', channel: 'count' });

    await vi.runAllTimersAsync();
    expect(engine.spoken).toEqual(['좋아요, 자세 유지']);

    engine.resolveNext();
    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(engine.spoken).toEqual(['좋아요, 자세 유지', '1회']);
  });

  it('drops stale queue items when stopped', async () => {
    const engine = new DeferredEngine();
    const queue = new SpeechQueueController(engine);

    queue.enqueue({ text: '첫 번째', channel: 'feedback' });
    queue.enqueue({ text: '두 번째', channel: 'count' });

    await vi.runAllTimersAsync();
    queue.stop();
    engine.resolveNext();
    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(engine.spoken).toEqual(['첫 번째']);
    expect(queue.getPendingCount()).toBe(0);
  });

  it('continues speaking new items after stop even if the canceled item never resolves', async () => {
    const engine = new DeferredEngine();
    const queue = new SpeechQueueController(engine);

    queue.enqueue({ text: 'before stop', channel: 'feedback' });
    await vi.runAllTimersAsync();

    queue.stop();
    queue.enqueue({ text: 'after restart', channel: 'count' });
    await vi.runAllTimersAsync();

    expect(engine.spoken).toEqual(['before stop', 'after restart']);
  });

  it('prefers Microsoft Korean voices when available', () => {
    const voice = choosePreferredKoreanVoice([
      { name: 'Google US English', lang: 'en-US' },
      { name: 'Microsoft Heami Online (Natural) - Korean (Korea)', lang: 'ko-KR' },
      { name: 'Google 한국의', lang: 'ko-KR' },
    ]);

    expect(voice?.name).toContain('Microsoft');
  });
});
