import type { Page } from '@playwright/test';

type NotificationPermissionState = 'default' | 'denied' | 'granted';

interface InstallNotificationMockOptions {
  permission?: NotificationPermissionState;
}

export const installNotificationMock = async (
  page: Page,
  options: InstallNotificationMockOptions = {},
) => {
  await page.addInitScript(({ permission }) => {
    const shown: Array<{ body?: string; title: string }> = [];

    class FakeNotification {
      static permission = permission;

      static async requestPermission() {
        return permission;
      }

      constructor(title: string, init?: NotificationOptions) {
        shown.push({
          title,
          body: init?.body,
        });
      }
    }

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: FakeNotification,
    });

    (window as typeof window & { __notificationTestState?: unknown }).__notificationTestState = {
      shown,
    };
  }, { permission: options.permission ?? 'denied' });
};

export const installSpeechSynthesisMock = async (page: Page) => {
  await page.addInitScript(() => {
    type SpeechState = {
      cancelCount: number;
      spoken: Array<{ text: string; voice: string | null }>;
    };

    class FakeSpeechSynthesisUtterance {
      text: string;
      lang = '';
      onend: null | (() => void) = null;
      onerror: null | (() => void) = null;
      pitch = 1;
      rate = 1;
      voice: { default?: boolean; lang: string; name: string } | null = null;
      volume = 1;

      constructor(text: string) {
        this.text = text;
      }
    }

    const voices = [
      {
        name: 'Microsoft SunHi Online (Natural) - Korean (Korea)',
        lang: 'ko-KR',
        default: true,
      },
      {
        name: 'Google US English',
        lang: 'en-US',
        default: false,
      },
    ];

    const state: SpeechState = {
      cancelCount: 0,
      spoken: [],
    };

    const speechSynthesis = {
      addEventListener: () => undefined,
      cancel: () => {
        state.cancelCount += 1;
      },
      getVoices: () => voices,
      removeEventListener: () => undefined,
      speak: (utterance: FakeSpeechSynthesisUtterance) => {
        state.spoken.push({
          text: utterance.text,
          voice: utterance.voice?.name ?? null,
        });

        window.setTimeout(() => {
          utterance.onend?.();
        }, 40);
      },
    };

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeSpeechSynthesisUtterance,
    });

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: speechSynthesis,
    });

    (window as typeof window & { __speechTestState?: unknown }).__speechTestState = state;
  });
};
