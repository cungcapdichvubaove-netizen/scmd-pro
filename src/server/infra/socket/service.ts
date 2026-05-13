import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { logger } from '../../core/logger/index.js';
import { AuthProviderFactory } from '../../core/auth/auth.provider.factory.js';
import { UserRole } from '../../core/architecture/types.js';
import { redisClient } from '../../core/redis.js';


export class SocketService {
  private static io: Server;

  static async init(httpServer: any) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000'];

    this.io = new Server(httpServer, {
      cors: {
        origin: (origin: string | undefined, callback: (err: Error | null, success?: boolean) => void) => {
          if (!origin) return callback(null, true);
          
          const isAllowed = allowedOrigins.some(allowed => {
            if (allowed.includes('*')) {
              const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
              return regex.test(origin);
            }
            return allowed === origin;
          });

          if (isAllowed || process.env.NODE_ENV !== 'production') {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // SCALABILITY UPGRADE: Redis Adapter for multi-instance support
    try {
      const { redisPubSub, isLocal } = await import('../../core/redis.js');
      if (!isLocal) {
        const pubClient = redisPubSub.getPub();
        const subClient = redisPubSub.getSub();
        
        this.io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter connected successfully');
      } else {
        logger.info('Running in local/mock mode. Using default Memory adapter for Socket.IO.');
      }
    } catch (err) {
      logger.error({ err }, 'Failed to initialize Socket.io Redis adapter. Fallback to Memory adapter.');
    }

    // Authentication Middleware
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Handle "Bearer <token>" format if present
      const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
      
      const authProvider = AuthProviderFactory.getProvider();
      const decoded = await authProvider.verifyToken(tokenValue);

      if (!decoded) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.data.user = decoded;
      next();
    });

    this.io.on("connection", async (socket) => {
      const user = (socket.data as any).user;
      const tenantId = user?.tenantId;
      
      logger.info({ 
        socketId: socket.id, 
        userId: user?.id, 
        tenantId,
        ip: socket.handshake.address 
      }, "Authenticated client connected");

      const broadcastOnlineUsers = async (tId: string) => {
        if (!tId) return;
        const room = `tenant:${tId}`;
        const sockets = await this.io.in(room).fetchSockets();
        const onlineUserIds = Array.from(new Set(sockets.map(s => (s.data as any).user?.id).filter(Boolean)));
        this.io.to(room).emit("online_users_updated", onlineUserIds);
      };

      // Rate limiting (Cluster-aware via Redis)
      socket.use(async ([event], next) => {
        const identifier = user?.id || socket.id;

        try {
          // 1. GLOBAL RATE LIMIT: 30 events/sec total
          const globalKey = `ratelimit:ws:global:${identifier}`;
          const globalCount = await redisClient.incr(globalKey);
          if (globalCount === 1) await redisClient.expire(globalKey, 1);
          
          if (globalCount > 30) {
            socket.emit('error', { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' });
            return next(new Error('WS_RATE_LIMIT_GLOBAL'));
          }

          // 2. CRITICAL ACTION LIMIT: join_tenant (5 per minute)
          if (event === 'join_tenant') {
            const joinKey = `ratelimit:ws:join:${identifier}`;
            const joinCount = await redisClient.incr(joinKey);
            if (joinCount === 1) await redisClient.expire(joinKey, 60);
            
            if (joinCount > 5) {
              socket.emit('error', { code: 'JOIN_LIMIT_EXCEEDED', event });
              return next(new Error('WS_RATE_LIMIT_JOIN'));
            }
          }

          // 3. PER-EVENT RATE LIMIT: 1 event/sec per type
          // Skip internal cleaning events
          if (['disconnect', 'online_users_updated'].includes(event)) {
            return next();
          }

          const eventKey = `ratelimit:ws:event:${identifier}:${event}`;
          const isAllowed = await redisClient.set(eventKey, '1', 'PX', 1000, 'NX');
          if (!isAllowed) {
            socket.emit('error', { code: 'EVENT_RATE_LIMIT', event });
            return next(new Error('WS_RATE_LIMIT_EVENT'));
          }

          next();
        } catch (err: any) {
          logger.warn({ err, socketId: socket.id }, 'Redis WS rate limit failed, allowing gracefully');
          next();
        }
      });

      // Defense-in-depth: Auto-join tenant room on connection
      if (tenantId) {
        const room = `tenant:${tenantId}`;
        await socket.join(room);
        logger.info({ socketId: socket.id, room }, "Client auto-joined tenant room");
        await broadcastOnlineUsers(tenantId);
      }

      // Cleanup on disconnect to prevent memory leaks
      socket.on("disconnecting", async () => {
        // We use disconnecting instead of disconnect to catch rooms before they are cleared
        const rooms = Array.from(socket.rooms);
        for (const room of rooms) {
          if (room.startsWith('tenant:')) {
            const tId = room.split(':')[1];
            // Since this socket is still in the room during "disconnecting", 
            // we need to filter it out in the broadcast or wait until it's fully gone.
            // A simple way is to delay the broadcast slightly.
            setTimeout(() => {
              if (tId) broadcastOnlineUsers(tId);
            }, 100);
          }
        }
      });

      socket.on("disconnect", (reason) => {
        logger.info({ socketId: socket.id, userId: user?.id, reason }, "Client disconnected and cleaned up");
        socket.removeAllListeners();
      });

      // We keep this for backward compatibility or explicit refreshes, 
      // but the data is already verified during handshake.
      socket.on("join_tenant", async (targetTenantId) => {
        if (user?.role !== UserRole.SUPER_ADMIN && tenantId !== targetTenantId) {
          logger.warn({ socketId: socket.id, userId: user?.id, attemptedTenant: targetTenantId }, "SECURITY_ALERT: Unauthorized join_tenant attempt");
          return;
        }

        const room = `tenant:${targetTenantId}`;
        await socket.join(room);
        logger.info({ socketId: socket.id, room }, "Client explicitly joined tenant room");
        await broadcastOnlineUsers(targetTenantId);
      });

      socket.on("sos_signal", (data) => {
        // SECURITY: Force use of authenticated tenantId, ignore client-provided one if mismatch
        const activeTenantId = (user?.role === UserRole.SUPER_ADMIN) ? (data.tenantId || tenantId) : tenantId;

        const room = `tenant:${activeTenantId}`;
        this.io.to(room).emit("sos_alert", {
          type: String(data.type || 'SOS').substring(0, 50),
          location: data.location ? { lat: Number(data.location.lat), lng: Number(data.location.lng) } : null,
          message: String(data.message || '').substring(0, 500),
          staffId: data.staffId ? String(data.staffId) : undefined,
          tenantId: activeTenantId, // Enforce correct tenantId in payload
          timestamp: new Date().toISOString()
        });
      });

      socket.on("patrol_update", (data) => {
        // SECURITY: Force use of authenticated tenantId
        const activeTenantId = (user?.role === UserRole.SUPER_ADMIN) ? (data.tenantId || tenantId) : tenantId;

        const room = `tenant:${activeTenantId}`;
        this.io.to(room).emit("patrol_update", {
          ...data,
          tenantId: activeTenantId,
          timestamp: new Date().toISOString()
        });
      });
    });

    return this.io;
  }

  static getIO() {
    if (!this.io) {
      throw new Error("Socket.io not initialized");
    }
    return this.io;
  }

  static emit({ tenantId, payload }: { tenantId: string, payload: any }) {
    if (this.io && tenantId) {
      this.io.to(`tenant:${tenantId}`).emit(payload.type, payload);
    }
  }

  static async close() {
    if (this.io) {
      logger.info('🛑 Closing Socket.io server...');
      await new Promise<void>((resolve) => {
        this.io.close(() => {
          logger.info('✅ Socket.io server closed');
          resolve();
        });
      });
    }
  }
}
