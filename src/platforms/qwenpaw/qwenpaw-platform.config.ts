// src/platforms/qwenpaw/qwenpaw-platform.config.ts

export class QwenPawConfig {
  constructor(
    public baseUrl: string,
    public apiKey: string,
    public pollIntervalMs: number = 5000,
    public pollTimeoutMs: number = 300000,
  ) {}

  static fromEnv(): QwenPawConfig {
    return new QwenPawConfig(
      process.env.QWENPAW_BASE_URL || 'http://localhost:5173',
      process.env.QWENPAW_API_KEY || '',
      parseInt(process.env.QWENPAW_POLL_INTERVAL || '5000', 10),
      parseInt(process.env.QWENPAW_POLL_TIMEOUT || '300000', 10),
    );
  }
}
