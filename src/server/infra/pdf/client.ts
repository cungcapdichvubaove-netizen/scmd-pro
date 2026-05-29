import { propagation, context } from '@opentelemetry/api';

export class PDFClient {
  static async generate(url: string, options: any, token?: string) {
    const carrier: Record<string, string> = {};
    propagation.inject(context.active(), carrier);

    try {
      const res = await fetch(`${process.env.PDF_SERVICE_URL || 'http://localhost:3001'}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pdf-secret': process.env.INTERNAL_API_SECRET || '',
          ...carrier
        },
        body: JSON.stringify({ url, options, token })
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}) as Record<string, unknown>);
        const errMsg = (err as Record<string, unknown>).error;
        throw new Error(`PDF Service responded with ${res.status}: ${typeof errMsg === 'string' ? errMsg : res.statusText}`);
      }
      
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      if (err.message.includes('ECONNREFUSED')) {
        throw new Error(`CRITICAL: PDF Service is down (127.0.0.1:3001). Please ensure 'npm run pdf:dev' is running or PDF microservice is enabled in server startup.`);
      }
      throw err;
    }
  }

  static async screenshot(url: string) {
    const carrier: Record<string, string> = {};
    propagation.inject(context.active(), carrier);

    const res = await fetch(`${process.env.PDF_SERVICE_URL || 'http://localhost:3001'}/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pdf-secret': process.env.INTERNAL_API_SECRET || '',
        ...carrier
      },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}) as Record<string, unknown>);
      const errMsg = (err as Record<string, unknown>).error;
      throw new Error(`Screenshot Service failed: ${typeof errMsg === 'string' ? errMsg : res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
