import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { trace, context } from '@opentelemetry/api';

export interface LogContext {
  traceId?: string;
  userId?: string;
  tenantId?: string;
}

export const loggerContext = new AsyncLocalStorage<LogContext>();

const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  mixin() {
    const ctx = loggerContext.getStore();
    
    // ENTERPRISE SYNC: Merge AsyncLocalStorage with OpenTelemetry Tracing
    const otelSpan = trace.getSpan(context.active());
    const otelTraceId = otelSpan?.spanContext().traceId;

    return { 
      traceId: otelTraceId || ctx?.traceId,
      userId: ctx?.userId, 
      tenantId: ctx?.tenantId 
    };
  }
};

const transport = process.env.LOKI_URL 
  ? pino.transport({
      target: 'pino-loki',
      options: {
        batching: true,
        interval: 5,
        host: process.env.LOKI_URL, // e.g., http://loki:3100
        labels: { app: 'scmd-api', env: process.env.NODE_ENV || 'development' },
      }
    })
  : undefined;

export const logger = transport ? pino(pinoOptions, transport) : pino(pinoOptions);

// Enterprise Metrics Light
export const monitor = {
  recordLatency: (name: string, duration: number, labels: Record<string, string> = {}) => {
    logger.info({ 
      metric: name, 
      durationMs: duration, 
      ...labels,
      type: 'LATENCY' 
    }, `Metric: ${name} took ${duration}ms`);
  },
  recordError: (name: string, labels: Record<string, string> = {}) => {
    logger.error({ 
      metric: name, 
      ...labels,
      type: 'ERROR_RATE' 
    }, `Metric Error: ${name}`);
  }
};
