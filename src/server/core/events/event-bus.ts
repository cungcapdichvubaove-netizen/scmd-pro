import { logger, loggerContext } from '../logger/index.js';

export interface DomainEvent {
  type: string;
  version: string; // Enterprise Requirement: Event Versioning
  tenantId: string;
  actorId: string;
  traceId?: string; // Enterprise Requirement: Trace propagation
  payload: any;
  occurredAt: string;
}

export class EventBus {
  /**
   * Dispatches an event using the Outbox Pattern.
   * This ensures that the event is only persisted if the transaction succeeds.
   */
  static async dispatch(event: Omit<DomainEvent, 'traceId' | 'occurredAt'>, tx: any) {
    if (!tx) {
        throw new Error('SYSTEM_ERROR: Event dispatch requires a transaction context (Outbox Pattern)');
    }

    const traceId = loggerContext.getStore()?.traceId;
    
    logger.info({ eventType: event.type, tenantId: event.tenantId, traceId }, 'Persisting event in outbox');
    
    // Store in outbox table
    await tx.eventOutbox.create({
      data: {
        tenantId: event.tenantId,
        eventType: event.type,
        traceId,
        version: event.version || '1.0',
        payload: {
          ...event.payload,
          _actorId: event.actorId
        },
        status: 'PENDING'
      }
    });
  }
}
