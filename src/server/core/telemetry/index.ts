import { NodeSDK } from '@opentelemetry/sdk-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import fs from 'fs';
import path from 'path';

diag.setLogger(
  new DiagConsoleLogger(),
  process.env.OTEL_DEBUG === 'true' ? DiagLogLevel.INFO : DiagLogLevel.NONE
);

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const isDebug = process.env.OTEL_DEBUG === 'true';

let sdk: NodeSDK | null = null;

let serviceVersion = process.env.npm_package_version;
if (!serviceVersion) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
    serviceVersion = pkg.version;
  } catch (e) {
    serviceVersion = '3.8.9';
  }
}

export const startTelemetry = () => {
  // Always initialize internal metrics baseline even if OTLP is missing
  // This ensures /metrics endpoint always has data
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'scmd-pro-backend',
    [ATTR_SERVICE_VERSION]: serviceVersion || '3.8.9',
    'deployment.environment': process.env.NODE_ENV || 'development',
  });

  let traceExporter: ConsoleSpanExporter | OTLPTraceExporter | undefined;
  if (otlpEndpoint) {
    traceExporter = new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` });
  } else if (isDebug) {
    traceExporter = new ConsoleSpanExporter();
  }

  // Metrics Setup
  let metricReader: PeriodicExportingMetricReader | undefined;
  if (otlpEndpoint) {
    metricReader = new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
      exportIntervalMillis: 60000, // Export every 60s
    });
  }

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new IORedisInstrumentation(),
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();
  console.log('🚀 [SCMD-PRO] Enterprise Observability (Traces & Metrics) initialized.');

  // Baseline Internal Metrics Collection (Self-Healing)
  setInterval(async () => {
    try {
      // 1. Sync Queue Metrics
      const { syncQueueMetrics } = await import('../queue/index.js');
      await syncQueueMetrics();

      // 2. Sync DB Pool Metrics (Prisma-specific logic if needed, or generic PG)
      // Prisma doesn't expose pool metrics easily without internal hacking, 
      // but we can track active requests if we have a middleware.
      // For now, focus on baseline visibility.
    } catch (err) {
      // Background silent failure
    }
  }, 15000); // Every 15s
};

process.on('SIGTERM', () => {
  if (sdk) {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  }
});

export default { start: startTelemetry };
