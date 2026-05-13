import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutboxProcessor } from './outbox-processor.js';
import { db } from '../../core/db/prisma.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { NotificationService } from '../../modules/notification/notification.service.js';
import { QueueService } from '../queue/index.js';
import { IncidentStatus, IncidentSeverity } from '@prisma/client';

// Mock dependencies
vi.mock('../../core/db/prisma.js', () => ({
  db: {
    system: vi.fn(),
    withTenant: vi.fn(),
  }
}));

vi.mock('../../core/audit/audit.service.js', () => ({
  AuditService: {
    log: vi.fn()
  }
}));

vi.mock('../../modules/notification/notification.service.js', () => ({
  NotificationService: {
    create: vi.fn()
  }
}));

vi.mock('../queue/index.js', () => ({
  QueueService: {
    addJob: vi.fn()
  }
}));

vi.mock('../../infra/socket/service.js', () => ({
  SocketService: {
    getIO: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      emit: vi.fn()
    }))
  }
}));

describe('OutboxProcessor E2E - SOS Flow', () => {
  const mockTenantId = 'tenant-123';
  const mockActorId = 'staff-456';
  const mockTraceId = 'trace-789';

  const mockSOSEvent = {
    id: 'event-001',
    eventType: 'SOS_SIGNAL',
    tenantId: mockTenantId,
    traceId: mockTraceId,
    version: '1.0',
    payload: {
      _actorId: mockActorId,
      location: { lat: 10.123456, lon: 106.654321, accuracy: 5 }
    },
    attempts: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process SOS_SIGNAL, create incident, schedule escalation and send notification', async () => {
    // 1. Setup mock Transaction and DB calls
    const mockTx = {
      eventOutbox: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({}),
      },
      incident: {
        create: vi.fn().mockResolvedValue({ id: 'inc-999' }),
      },
      notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-111' }),
      },
      $queryRaw: vi.fn().mockResolvedValue([mockSOSEvent]),
    };

    // Mock db.system().$transaction for processPendingEvents polling
    vi.mocked(db.system).mockReturnValue({
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx))
    } as any);

    // Mock db.withTenant for individual event processing
    vi.mocked(db.withTenant).mockImplementation(async (tId, cb) => {
      // Check that it's called with correct tenant
      expect(tId).toBe(mockTenantId);
      return cb(mockTx);
    });

    // Mock NotificationService.create
    vi.mocked(NotificationService.create).mockResolvedValue({ id: 'notif-111' } as any);

    // 2. Execute processPendingEvents
    await OutboxProcessor.processPendingEvents();

    // 3. Assertions for the SOS flow
    
    // Check AuditLog
    expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'SOS_SIGNAL',
      tenantId: mockTenantId,
      userId: mockActorId,
      status: 'SUCCESS'
    }), mockTx);

    // Check Incident creation
    expect(mockTx.incident.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: mockTenantId,
        staffId: mockActorId,
        type: 'SOS',
        severity: IncidentSeverity.CRITICAL,
        description: expect.stringContaining('SOS khẩn cấp'),
        status: IncidentStatus.REPORTED,
        location: mockSOSEvent.payload.location
      })
    });

    // Check Escalation Queueing
    expect(QueueService.addJob).toHaveBeenCalledWith(
      'sos-escalation-check',
      expect.objectContaining({
        incidentId: 'inc-999',
        tenantId: mockTenantId,
        staffId: mockActorId
      }),
      'escalation:inc-999', // Stable salt / Job ID
      expect.objectContaining({ delay: 300000 }) // 5 minutes
    );

    // Check Notification
    expect(NotificationService.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: mockTenantId,
      type: 'SOS',
      title: expect.stringContaining('SOS')
    }), mockTx);

    // Check Outbox status marked as PROCESSED
    expect(mockTx.eventOutbox.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: mockSOSEvent.id },
      data: expect.objectContaining({
        status: 'PROCESSED'
      })
    }));
  });

  it('should mark event as DEAD_LETTER if max retries reached', async () => {
    const failingEvent = {
        ...mockSOSEvent,
        id: 'event-fail',
        attempts: 4 // Next attempt will be 5 (max)
    };

    const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([failingEvent]),
        eventOutbox: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({}),
        }
    };

    vi.mocked(db.system).mockReturnValue({
        $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx))
    } as any);

    vi.mocked(db.withTenant).mockImplementation(async (tId, cb) => {
        return cb(mockTx);
    });

    // Cause an error during processing
    vi.mocked(AuditService.log).mockRejectedValue(new Error('SYSTEM_FAILURE'));

    await OutboxProcessor.processPendingEvents();

    expect(mockTx.eventOutbox.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'event-fail' },
        data: expect.objectContaining({
            status: 'DEAD_LETTER',
            attempts: 5
        })
    }));
  });
});
