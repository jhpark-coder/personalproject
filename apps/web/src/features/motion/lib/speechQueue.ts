export type SpeechChannel = 'feedback' | 'count' | 'status';

export interface SpeechVoiceLike {
  name: string;
  lang: string;
  default?: boolean;
}

export interface SpeechTask {
  text: string;
  channel?: SpeechChannel;
  dedupeMs?: number;
  replacePending?: boolean;
}

export interface SpeechEngine {
  cancel(): void;
  getVoices?(): SpeechVoiceLike[];
  speak(text: string): Promise<void>;
}

export class SpeechQueueController {
  private readonly lastQueuedAt = new Map<string, number>();
  private readonly queue: SpeechTask[] = [];
  private processing = false;
  private generation = 0;

  constructor(private readonly engine: SpeechEngine) {}

  enqueue(task: SpeechTask): boolean {
    const channel = task.channel ?? 'feedback';
    const dedupeKey = `${channel}:${task.text}`;
    const now = Date.now();

    if (task.dedupeMs && now - (this.lastQueuedAt.get(dedupeKey) ?? 0) < task.dedupeMs) {
      return false;
    }

    this.lastQueuedAt.set(dedupeKey, now);

    if (task.replacePending) {
      for (let i = this.queue.length - 1; i >= 0; i -= 1) {
        if ((this.queue[i].channel ?? 'feedback') === channel) {
          this.queue.splice(i, 1);
        }
      }
    }

    this.queue.push(task);
    void this.processQueue();
    return true;
  }

  stop() {
    this.generation += 1;
    this.queue.length = 0;
    this.engine.cancel();
  }

  getPendingCount() {
    return this.queue.length;
  }

  private async processQueue() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    const runId = this.generation;

    try {
      while (this.queue.length > 0 && runId === this.generation) {
        const next = this.queue.shift();
        if (!next) {
          continue;
        }

        await this.engine.speak(next.text);
      }
    } finally {
      this.processing = false;
      if (this.queue.length > 0 && runId === this.generation) {
        void this.processQueue();
      }
    }
  }
}

export const choosePreferredKoreanVoice = (voices: SpeechVoiceLike[]) => {
  if (voices.length === 0) {
    return null;
  }

  const koreanVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('ko'));
  if (koreanVoices.length === 0) {
    return voices.find((voice) => voice.default) ?? voices[0];
  }

  return (
    koreanVoices.find((voice) => /microsoft|edge/i.test(voice.name)) ??
    koreanVoices.find((voice) => /heami|injoon|sunhi|seoyeon/i.test(voice.name)) ??
    koreanVoices.find((voice) => voice.default) ??
    koreanVoices[0]
  );
};

interface BrowserSpeechSynthesisLike {
  addEventListener?: (type: 'voiceschanged', listener: () => void) => void;
  cancel(): void;
  getVoices(): SpeechSynthesisVoice[];
  removeEventListener?: (type: 'voiceschanged', listener: () => void) => void;
  speak(utterance: SpeechSynthesisUtterance): void;
}

export const createBrowserSpeechEngine = (
  speechSynthesis: BrowserSpeechSynthesisLike,
  createUtterance: (text: string) => SpeechSynthesisUtterance = (text) =>
    new SpeechSynthesisUtterance(text),
): SpeechEngine => ({
  cancel() {
    speechSynthesis.cancel();
  },
  getVoices() {
    return speechSynthesis.getVoices().map((voice) => ({
      name: voice.name,
      lang: voice.lang,
      default: voice.default,
    }));
  },
  speak(text: string) {
    return new Promise<void>((resolve, reject) => {
      const utterance = createUtterance(text);
      const voice = choosePreferredKoreanVoice(
        speechSynthesis.getVoices().map((item) => ({
          name: item.name,
          lang: item.lang,
          default: item.default,
        })),
      );

      utterance.lang = voice?.lang ?? 'ko-KR';
      utterance.rate = 1.02;
      utterance.pitch = 1;
      utterance.volume = 1;

      const browserVoice = speechSynthesis
        .getVoices()
        .find((item) => item.name === voice?.name && item.lang === voice?.lang);
      if (browserVoice) {
        utterance.voice = browserVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error('speech_synthesis_failed'));

      speechSynthesis.speak(utterance);
    });
  },
});
