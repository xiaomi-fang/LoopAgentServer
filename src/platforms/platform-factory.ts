import { AgentPlatform } from './agent-platform.interface';

export class AgentPlatformFactory {
  private static registry = new Map<string, new (config: any) => AgentPlatform>();

  static register(type: string, ctor: new (config: any) => AgentPlatform): void {
    this.registry.set(type, ctor);
  }

  static create(type: string, config: any): AgentPlatform {
    const ctor = this.registry.get(type);
    if (!ctor) throw new Error(`Unknown platform type: ${type}`);
    return new ctor(config);
  }

  static registeredTypes(): string[] {
    return Array.from(this.registry.keys());
  }
}
