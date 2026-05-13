import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from './auth.controller.js';
import { redisClient } from '../../core/redis.js';
import { StaffRepository } from '../staff/staff.repository.js';
import { Request, Response } from 'express';
import { TenantRepository } from '../tenant/tenant.repository.js';

// Mock redis client
vi.mock('../../core/redis.js', () => ({
  redisClient: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn()
  }
}));

// Mock repositories
vi.mock('../staff/staff.repository.js', () => ({
  StaffRepository: {
    getByUsername: vi.fn(),
    getByUsernameAndTenant: vi.fn()
  }
}));

vi.mock('../tenant/tenant.repository.js', () => ({
  TenantRepository: {
    getBySubdomain: vi.fn()
  }
}));

vi.mock('../../core/audit/audit.service.js', () => ({
  AuditService: {
    log: vi.fn()
  }
}));

describe('AuthController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      body: {},
      ip: '127.0.0.1',
      headers: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  describe('login', () => {
    beforeEach(() => {
      // Default mock for tenant lookup
      vi.mocked(TenantRepository.getBySubdomain).mockResolvedValue({ 
        id: 'tenant-1', 
        status: 'active',
        subdomain: 'demo'
      } as any);
    });

    it('should block login if IP attempts exceed limit', async () => {
      req.body = { 
        username: 'testuser', 
        password: 'password123', 
        tenantCode: 'demo' 
      };
      
      // Simulate too many attempts from this IP
      vi.mocked(redisClient.get).mockImplementation((key) => {
        if (key.includes('login_attempts_ip')) return Promise.resolve('20');
        return Promise.resolve(null);
      });

      await AuthController.login(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining("Quá nhiều lần đăng nhập sai")
      }));
    });

    it('should block login if user attempts exceed limit', async () => {
      req.body = { 
        username: 'targetuser', 
        password: 'password123', 
        tenantCode: 'demo' 
      };
      
      // Simulate too many attempts for this specific user
      vi.mocked(redisClient.get).mockImplementation((key) => {
        if (key.includes('login_attempts_user')) return Promise.resolve('5');
        return Promise.resolve(null);
      });

      await AuthController.login(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining("Quá nhiều lần đăng nhập sai")
      }));
    });

    it('should combine tenantCode in user attempt lock key to prevent cross-tenant DoS', async () => {
       req.body = { 
        username: 'admin', 
        password: 'wrongpassword', 
        tenantCode: 'demo' 
      };

      await AuthController.login(req as Request, res as Response, next);

      // Verify the key used for user attempts includes tenantCode
      expect(redisClient.get).toHaveBeenCalledWith(expect.stringContaining('demo:admin'));
    });

    it('should successfully login a valid user and rotate tokens', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      req.body = { 
        username: 'testuser', 
        password: 'password123', 
        tenantCode: 'demo' 
      };

      vi.mocked(StaffRepository.getByUsername).mockResolvedValue(null);
      vi.mocked(StaffRepository.getByUsernameAndTenant).mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        password: hashedPassword,
        role: 'guard',
        tenantId: 'tenant-1',
        fullName: 'Test User'
      } as any);

      // Mock zero attempts
      vi.mocked(redisClient.get).mockResolvedValue(null);

      await AuthController.login(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        token: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({ username: 'testuser' })
      }));

      // Verify Redis cleanup
      expect(redisClient.del).toHaveBeenCalledWith(expect.stringContaining('login_attempts_ip'));
    });

    it('should prioritize super-admin lookup even with tenantCode provided', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('adminpass', 10);
      
      req.body = { 
        username: 'superadmin', 
        password: 'adminpass', 
        tenantCode: 'demo' 
      };

      // Mock super-admin exists
      vi.mocked(StaffRepository.getByUsername).mockResolvedValue({
        id: 'sa-1',
        username: 'superadmin',
        password: hashedPassword,
        role: 'super-admin',
        tenantId: 'system',
        fullName: 'Super Admin'
      } as any);

      await AuthController.login(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({ role: 'super-admin' })
      }));
      
      // Should NOT have called getByUsernameAndTenant
      expect(StaffRepository.getByUsernameAndTenant).not.toHaveBeenCalled();
    });
  });
});
