/// <reference types="vite/client" />

declare module '@mediapipe/pose' {
  export class Pose {
    constructor(config?: { locateFile?: (file: string) => string });
    setOptions(options: any): void;
    onResults(callback: (results: any) => void): void;
    send(input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
    close(): void;
  }
}
