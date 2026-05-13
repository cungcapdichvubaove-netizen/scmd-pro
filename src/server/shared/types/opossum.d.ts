declare module 'opossum' {
  import { EventEmitter } from 'events';

  interface Options {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    rollingCountTimeout?: number;
    rollingCountBuckets?: number;
    name?: string;
    group?: string;
    capacity?: number;
    maxFailures?: number;
  }

  export default class CircuitBreaker extends EventEmitter {
    constructor(action: (...args: any[]) => Promise<any>, options?: Options);
    fire(...args: any[]): Promise<any>;
    fallback(callback: (...args: any[]) => any): this;
    opened: boolean;
    closed: boolean;
    halfOpen: boolean;
    status: any;
    name: string;
    group: string;
  }
}
