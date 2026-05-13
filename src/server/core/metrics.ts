import { metrics as otelMetrics, Meter } from '@opentelemetry/api';
import { logger } from './logger/index.js';
import client from 'prom-client';

// Initialize Prometheus Registry
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

// Define Application Specific Metrics
const queueDepth = new client.Gauge({
  name: 'scmd_queue_depth',
  help: 'Number of jobs in queues',
  labelNames: ['queue', 'status'],
  registers: [registry],
});

const dbPoolUsage = new client.Gauge({
  name: 'scmd_db_pool_usage',
  help: 'Database connection pool usage',
  labelNames: ['state'], // connected, idle
  registers: [registry],
});

const circuitBreakerState = new client.Gauge({
  name: 'scmd_circuit_breaker_state',
  help: 'Circuit breaker state (0: closed, 1: open, 2: half-open)',
  labelNames: ['name'],
  registers: [registry],
});

const recaptchaBypass = new client.Counter({
  name: 'scmd_recaptcha_bypass_total',
  help: 'Total number of times reCAPTCHA was bypassed due to service unavailability',
  labelNames: ['action', 'reason'],
  registers: [registry],
});

const sloLatency = new client.Histogram({
  name: 'scmd_slo_latency_ms',
  help: 'Latency of critical operations in ms',
  labelNames: ['operation', 'tenant_id'],
  registers: [registry],
  buckets: [100, 500, 1000, 2500, 5000, 10000],
});

interface MetricValue {
  count: number;
  sum: number;
  min: number;
  max: number;
  lastUpdated: Date;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, MetricValue> = new Map();
  private startTime = new Date();
  private meter: Meter;
  private histograms: Map<string, any> = new Map();
  private counters: Map<string, any> = new Map();

  private constructor() {
    this.meter = otelMetrics.getMeter('scmd-pro-slo');
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Records a latency/duration metric for SLO.
   * Auto-instruments with OTel Histogram and Prometheus.
   */
  recordSLO(name: string, value: number, attributes: Record<string, string | number | boolean> = {}) {
    // Local tracking
    this.record(name, value, attributes as any);

    // OTel tracking
    if (!this.histograms.has(name)) {
      this.histograms.set(name, this.meter.createHistogram(name, {
        description: `SLO Metric: ${name}`,
        unit: 'ms',
      }));
    }
    this.histograms.get(name).record(value, attributes);

    // Prometheus tracking
    sloLatency.labels(name, String(attributes.tenant_id || 'system')).observe(value);

    // Severity check
    if (value > 5000) { // Default SLO threshold 5s
      logger.warn({
        metric: name,
        value,
        tenantId: attributes.tenant_id,
        category: 'SLO_VIOLATION'
      }, `SLO threshold exceeded for ${name}: ${value}ms`);
    }
  }

  /**
   * Records a counter metric (e.g. error rate).
   */
  incrementCounter(name: string, attributes: Record<string, string | number | boolean> = {}) {
    if (!this.counters.has(name)) {
      this.counters.set(name, this.meter.createCounter(name, {
        description: `SLO Counter: ${name}`,
      }));
    }
    this.counters.get(name).add(1, attributes);
    
    // Prometheus specific counters
    if (name === 'recaptcha_bypass') {
      recaptchaBypass.inc({ 
        action: String(attributes.action || 'unknown'), 
        reason: String(attributes.reason || 'timeout') 
      });
    }

    // Also record locally so it appears in getSnapshot()
    this.record(name, 1, attributes as Record<string, string>);
  }

  record(name: string, value: number, labels: Record<string, string> = {}) {
    const key = `${name}${JSON.stringify(labels)}`;
    const current = this.metrics.get(key) || {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      lastUpdated: new Date()
    };

    current.count++;
    current.sum += value;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
    current.lastUpdated = new Date();

    this.metrics.set(key, current);
    
    if (value > 10000) { 
      logger.warn({ metric: name, value, ...labels, type: 'METRIC_THRESHOLD_EXCEEDED' }, `Large metric value recorded for ${name}`);
    }
  }

  // Update specific internal metrics
  updateQueueDepth(queueName: string, status: string, count: number) {
    queueDepth.labels(queueName, status).set(count);
    this.record(`queue_${queueName}_${status}`, count);
  }

  updateCircuitBreaker(name: string, state: 'closed' | 'open' | 'half-open') {
    const value = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
    circuitBreakerState.labels(name).set(value);
    this.record(`cb_${name}_state`, value);
  }

  updateDBPool(idle: number, active: number) {
    dbPoolUsage.labels('idle').set(idle);
    dbPoolUsage.labels('active').set(active);
    this.record('db_pool_idle', idle);
    this.record('db_pool_active', active);
  }

  async getPrometheusMetrics() {
    return registry.metrics();
  }

  /**
   * Aggregates all system health data for a unified view.
   */
  async getDetailedSnapshot() {
    const memory = process.memoryUsage();
    const uptime = (Date.now() - this.startTime.getTime()) / 1000;

    // Internal stats from providers
    let dbStats = { idle: 0, active: 0, total: 0 };
    let redisStats = { usedMemoryMB: 0, poolSize: 0 };
    let queueStats: any[] = [];
    let circuitBreakers: any[] = [];

    // Extract circuit breaker states from recorded metrics
    this.metrics.forEach((val, key) => {
      if (key.startsWith('cb_')) {
        const name = key.replace('cb_', '').replace('_state{}', '');
        circuitBreakers.push({
          name,
          stateCode: val.sum / val.count, // 0: closed, 1: open, 2: half-open
          lastUpdated: val.lastUpdated
        });
      }
      if (key.startsWith('queue_')) {
        queueStats.push({ key, count: val.sum / val.count, lastUpdated: val.lastUpdated });
      }
    });

    try {
      // Dynamic DB pool stats
      const { getPoolStats } = await import('./db/prisma.js');
      dbStats = getPoolStats();
    } catch (e: any) {
      const { logger } = await import('./logger/index.js');
      logger.warn({ err: e }, 'Failed to fetch DB pool stats for metrics snapshot');
    }

    try {
      // Dynamic Redis stats
      const { getRedisInfo } = await import('./redis.js');
      redisStats = await getRedisInfo();
    } catch (e: any) {
      const { logger } = await import('./logger/index.js');
      logger.warn({ err: e }, 'Failed to fetch Redis stats for metrics snapshot');
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(uptime),
      process: {
        memoryHeapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
        memoryHeapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
        memoryRSSMB: Math.round(memory.rss / 1024 / 1024),
        cpuUsage: process.cpuUsage()
      },
      infrastructure: {
        database: dbStats,
        redis: redisStats,
        circuitBreakers,
        queues: queueStats
      },
      slo: Array.from(this.metrics.entries())
        .filter(([key]) => key.includes('duration') || key.includes('error'))
        .map(([key, val]) => ({
          key,
          avg: val.count > 0 ? val.sum / val.count : 0,
          count: val.count,
          lastUpdated: val.lastUpdated
        }))
    };
  }

  getSnapshot() {
    const uptime = (Date.now() - this.startTime.getTime()) / 1000;
    const memory = process.memoryUsage();
    
    return {
      uptimeSeconds: uptime,
      timestamp: new Date().toISOString(),
      process: {
        memoryHeapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
        memoryHeapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
        memoryRSSMB: Math.round(memory.rss / 1024 / 1024),
      },
      metrics: Array.from(this.metrics.entries()).map(([key, val]) => ({
        key,
        avg: val.count > 0 ? val.sum / val.count : 0,
        ...val
      }))
    };
  }
}

export const metrics = MetricsCollector.getInstance();
