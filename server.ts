import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { AsyncLocalStorage } from "async_hooks";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import puppeteer from "puppeteer";
import { createServer } from "http";
import { Server } from "socket.io";
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  addDoc,
  Timestamp,
  deleteDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { db as firestore } from "./src/lib/firebase.js";
import { SuperAdminService } from "./src/apps/core/application/services/SuperAdminService";
import { sanitize } from "./src/shared/utils/security";
import { calculateDistance } from "./src/shared/utils/geo";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CORE TYPES & INTERFACES ---
interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  schema_name: string;
  plan: string;
  max_employees: number;
  is_active: boolean;
  provisioning_status: 'queued' | 'cloning_schema' | 'generating_ssl' | 'running_health_checks' | 'active';
  features_enabled: { patrol: boolean; attendance: boolean; ai_analytics: boolean };
  admin_password?: string;
  token_version: number;
  expiry_date: Date;
  created_at: Date;
}

interface Staff {
  id: string;
  tenantId: string;
  username: string;
  password?: string;
  name: string;
  role: 'guard' | 'tenant_admin' | 'super_admin';
  staffId?: string;
}

interface Checkpoint {
  id: string;
  tenantId: string;
  name: string;
  latitude: number;
  longitude: number;
  qr_hash: string;
  status?: string;
  check_items?: any[];
  benchmark_work_duration?: number;
  benchmark_travel_time?: number;
}

interface PatrolLog {
  id: string;
  tenantId: string;
  checkpointId: string;
  checkpointName: string;
  staffId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  isSuspicious: boolean;
  suspicionReason?: string;
  createdAt: Date;
  trustScore?: number;
}

interface Incident {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  severity: 'Thấp' | 'Trung bình' | 'Cao';
  status: string;
  location: { lat: number; lon: number };
  createdAt: Date;
}

// --- INFRASTRUCTURE HARDENING: SECRETS & LOGGING ---
const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const SALT_ROUNDS = 12;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error("CRITICAL ERROR: JWT secrets are not defined in environment variables.");
  process.exit(1);
}

// --- FIREBASE CONFIG VALIDATION ---
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
if (!FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID === "YOUR_PROJECT_ID") {
  console.error("CRITICAL ERROR: Firebase Project ID is not configured.");
  console.error("Please update your .env file with real Firebase credentials.");
  console.error("Current Project ID:", FIREBASE_PROJECT_ID);
  process.exit(1);
}

const logger = {
  info: (message: string, context: any = {}) => {
    console.log(JSON.stringify({ level: "INFO", timestamp: new Date().toISOString(), message, ...context }));
  },
  warn: (message: string, context: any = {}) => {
    console.warn(JSON.stringify({ level: "WARN", timestamp: new Date().toISOString(), message, ...context }));
  },
  error: (message: string, context: any = {}) => {
    console.error(JSON.stringify({ level: "ERROR", timestamp: new Date().toISOString(), message, ...context }));
  }
};

// --- RATE LIMITING (Brute Force Protection) ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // Giới hạn 10 lần thử cho mỗi IP
  message: { detail: "Quá nhiều lần thử. Vui lòng thử lại sau 15 phút." },
  standardHeaders: true,
  legacyHeaders: false,
});

const provisioningLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5, // Giới hạn 5 lần đăng ký cho mỗi IP mỗi giờ
  message: { detail: "Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau 1 giờ." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- ROLE NORMALIZATION UTILITY ---
const normalizeRole = (input: any): 'guard' | 'tenant_admin' => {
  if (!input) return 'guard';
  const roleStr = String(input).toLowerCase().trim();
  // Chỉ những giá trị này mới được coi là Admin
  if (['tenant_admin', 'admin', 'quản trị', 'quản trị viên'].includes(roleStr)) {
    return 'tenant_admin';
  }
  return 'guard';
};

// --- AUTH UTILS ---
const signToken = (payload: any) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
};

const signRefreshToken = (payload: any) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
};

// AsyncLocalStorage for Tenant Isolation at the deepest level
const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Real-time event handling
  io.on("connection", (socket) => {
    logger.info("New client connected", { socketId: socket.id });

    socket.on("join_tenant", (tenantId) => {
      socket.join(`tenant_${tenantId}`);
      logger.info("Client joined tenant room", { socketId: socket.id, tenantId });
    });

    socket.on("sos_signal", (data) => {
      // data: { tenantId, staffId, location, message }
      io.to(`tenant_${data.tenantId}`).emit("sos_alert", {
        ...data,
        timestamp: new Date().toISOString()
      });
      logger.warn("SOS Signal Received", data);
    });

    socket.on("patrol_update", (data) => {
      // data: { tenantId, staffId, checkpointName, status, anomaly }
      io.to(`tenant_${data.tenantId}`).emit("patrol_update", {
        ...data,
        timestamp: new Date().toISOString()
      });
      logger.info("Patrol Update Received", data);
    });

    socket.on("disconnect", () => {
      logger.info("Client disconnected", { socketId: socket.id });
    });
  });

  const PORT = 3000;

  // --- DATABASE LAYER (Firestore Integration) ---
  const firestoreDb = {
    tenants: {
      getAll: async () => {
        const snapshot = await getDocs(collection(firestore, "tenants"));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
      getById: async (id: string): Promise<Tenant | null> => {
        const docRef = doc(firestore, "tenants", id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Tenant : null;
      },
      save: async (data: Partial<Tenant>) => {
        const id = data.id || randomUUID();
        if (data.admin_password) {
          data.admin_password = await bcrypt.hash(data.admin_password, SALT_ROUNDS);
        }
        await setDoc(doc(firestore, "tenants", id), { ...data, id });
        return { ...data, id } as Tenant;
      }
    },
    checkpoints: {
      getByTenant: async (tenantId: string): Promise<Checkpoint[]> => {
        const q = query(collection(firestore, "checkpoints"), where("tenantId", "==", tenantId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Checkpoint[];
      },
      delete: async (id: string) => {
        await deleteDoc(doc(firestore, "checkpoints", id));
      },
      save: async (data: Partial<Checkpoint>) => {
        const docRef = await addDoc(collection(firestore, "checkpoints"), { ...data, created_at: Timestamp.now() });
        return { id: docRef.id, ...data } as Checkpoint;
      }
    },
    staff: {
      getByTenant: async (tenantId: string): Promise<Staff[]> => {
        const q = query(collection(firestore, "staff"), where("tenantId", "==", tenantId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Staff[];
      },
      getByUsername: async (username: string, tenantId?: string): Promise<Staff | null> => {
        let q = query(collection(firestore, "staff"), where("username", "==", username));
        if (tenantId) {
          q = query(collection(firestore, "staff"), where("username", "==", username), where("tenantId", "==", tenantId));
        }
        const snapshot = await getDocs(q);
        return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Staff;
      },
      delete: async (id: string) => {
        await deleteDoc(doc(firestore, "staff", id));
      },
      save: async (data: Partial<Staff>) => {
        // Chỉ hash nếu mật khẩu chưa được hash (bcrypt hash luôn bắt đầu bằng $2b$)
        if (data.password && !data.password.startsWith('$2b$')) {
          data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
        }

        if (data.id) {
          // Cập nhật bản ghi hiện có
          const docRef = doc(firestore, "staff", data.id);
          await setDoc(docRef, { ...data, updated_at: Timestamp.now() }, { merge: true });
          return data as Staff;
        } else {
          // Tạo bản ghi mới
          const docRef = await addDoc(collection(firestore, "staff"), { ...data, created_at: Timestamp.now() });
          return { id: docRef.id, ...data } as Staff;
        }
      }
    },
    patrol_logs: {
      getByTenant: async (tenantId: string): Promise<PatrolLog[]> => {
        const q = query(collection(firestore, "patrol_logs"), where("tenantId", "==", tenantId), orderBy("createdAt", "desc"), limit(100));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatrolLog[];
      },
      save: async (data: Partial<PatrolLog>) => {
        const docRef = await addDoc(collection(firestore, "patrol_logs"), { ...data, createdAt: Timestamp.now() });
        return { id: docRef.id, ...data } as PatrolLog;
      }
    },
    incidents: {
      getByTenant: async (tenantId: string): Promise<Incident[]> => {
        const q = query(collection(firestore, "incidents"), where("tenantId", "==", tenantId), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Incident[];
      },
      getById: async (id: string) => {
        const docRef = doc(firestore, "incidents", id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
      },
      save: async (data: Partial<Incident>) => {
        const docRef = await addDoc(collection(firestore, "incidents"), { ...data, createdAt: Timestamp.now() });
        return { id: docRef.id, ...data } as Incident;
      }
    },
    notifications: {
      getByTenant: async (tenantId: string) => {
        const q = query(collection(firestore, "notifications"), where("tenantId", "==", tenantId), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    },
    magic_tokens: {
      getValid: async (token: string) => {
        const q = query(
          collection(firestore, "magic_tokens"),
          where("token", "==", token),
          where("used", "==", false)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        const expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAt < new Date()) return null;
        return { id: docSnap.id, ...data };
      },
      markAsUsed: async (id: string) => {
        const docRef = doc(firestore, "magic_tokens", id);
        await updateDoc(docRef, { used: true });
      },
      save: async (data: any) => {
        await addDoc(collection(firestore, "magic_tokens"), {
          ...data,
          expiresAt: data.expiresAt instanceof Date ? Timestamp.fromDate(data.expiresAt) : data.expiresAt,
          createdAt: Timestamp.now()
        });
      }
    },
    subscriptions: {
      getByTenant: async (tenantId: string) => {
        const q = query(collection(firestore, "subscriptions"), where("tenantId", "==", tenantId), limit(1));
        const snapshot = await getDocs(q);
        return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
      }
    }
  };

  // --- TENANT ISOLATION WRAPPER ---
  // This wrapper ensures that all queries are automatically scoped to the current tenant
  const db = {
    tenants: {
      getAll: () => firestoreDb.tenants.getAll(),
      getById: (id: string) => firestoreDb.tenants.getById(id),
      save: (data: any) => firestoreDb.tenants.save(data)
    },
    checkpoints: {
      getAll: async () => {
        const context = tenantStorage.getStore();
        if (!context) return [];
        return firestoreDb.checkpoints.getByTenant(context.tenantId);
      },
      save: (data: any) => {
        const context = tenantStorage.getStore();
        if (!context?.tenantId) {
          throw new Error("Tenant context missing during checkpoint save");
        }
        return firestoreDb.checkpoints.save({ ...data, tenantId: context?.tenantId });
      }
    },
    staff: {
      getAll: async () => {
        const context = tenantStorage.getStore();
        if (!context) return [];
        return firestoreDb.staff.getByTenant(context.tenantId);
      },
      save: (data: any) => {
        const context = tenantStorage.getStore();
        if (!context?.tenantId) {
          throw new Error("Tenant context missing during staff save");
        }
        return firestoreDb.staff.save({ ...data, tenantId: context?.tenantId });
      }
    },
    patrol_logs: {
      getAll: async () => {
        const context = tenantStorage.getStore();
        if (!context) return [];
        return firestoreDb.patrol_logs.getByTenant(context.tenantId);
      },
      save: (data: any) => {
        const context = tenantStorage.getStore();
        if (!context?.tenantId) {
          throw new Error("Tenant context missing during patrol log save");
        }
        return firestoreDb.patrol_logs.save({ ...data, tenantId: context?.tenantId });
      }
    },
    incidents: {
      getAll: async () => {
        const context = tenantStorage.getStore();
        if (!context) return [];
        return firestoreDb.incidents.getByTenant(context.tenantId);
      },
      save: (data: any) => {
        const context = tenantStorage.getStore();
        if (!context?.tenantId) {
          throw new Error("Tenant context missing during incident save");
        }
        return firestoreDb.incidents.save({ ...data, tenantId: context?.tenantId });
      }
    },
    notifications: {
      getAll: async () => {
        const context = tenantStorage.getStore();
        if (!context) return [];
        return firestoreDb.notifications.getByTenant(context.tenantId);
      }
    },
    attendance: {
      save: async (data: any) => {
        const context = tenantStorage.getStore();
        if (!context?.tenantId) {
          throw new Error("Tenant context missing during attendance save");
        }
        const docRef = await addDoc(collection(firestore, "attendance"), { ...data, tenantId: context?.tenantId, createdAt: Timestamp.now() });
        return { id: docRef.id, ...data };
      }
    },
    saveCheckpoint: (data: any) => db.checkpoints.save(data),
    saveStaff: (data: any) => db.staff.save(data),
    saveIncident: (data: any) => db.incidents.save(data),
    saveRoute: (data: any) => Promise.resolve({ id: "mock" }) // Mock for now
  };

  // --- SECURITY LAYER ---
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedDomains = [/\.scmd\.vn$/, /localhost/, /\.run\.app$/, /\.aistudio-preview\.com$/];
      const isAllowed = allowedDomains.some(domain => 
        typeof domain === 'string' ? origin === domain : domain.test(origin)
      );
      if (isAllowed || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  app.use(express.json());

  const logAudit = (req: Request, event: string, details: any) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const tenantId = (req as any).tenantId;
    const staffId = (req as any).user?.id || 'system';
    logger.info("Audit Log", { tenantId, staffId, event, details, ip });
  };

  // --- DATA ISOLATION MIDDLEWARE ---
  app.use(async (req, res, next) => {
    try {
      const host = req.headers.host || "";
      let tenantId = req.headers["x-tenant-id"] as string;
      
      // NEW: Nếu có Token, ưu tiên lấy tenantId từ Token để đảm bảo lưu đúng chỗ
      const authHeader = req.headers.authorization;
      if (!tenantId && authHeader?.startsWith("Bearer ")) {
        const decoded = verifyToken(authHeader.split(" ")[1]) as any;
        if (decoded?.tenantId) tenantId = decoded.tenantId;
      }

      const tenants = await firestoreDb.tenants.getAll();

      // Resolve tenantId if it's a slug/subdomain
      if (tenantId && tenantId !== 'system') {
        const found = tenants.find((t: any) => t.id === tenantId || t.subdomain?.split('.')[0] === tenantId);
        if (found) tenantId = found.id;
      }

      // Fallback to host-based detection if header is missing
      if (!tenantId && host && host !== 'localhost:3000') {
        const tenant = tenants.find((t: any) => t.subdomain && host.includes(t.subdomain));
        if (tenant) tenantId = tenant.id;
      }

      tenantId = tenantId || "tenant_1";

      if (req.path.startsWith('/api/')) {
        logger.info(`Routing request to Tenant: ${tenantId}`, { path: req.path, method: req.method });
      }

      tenantStorage.run({ tenantId }, async () => {
        (req as any).tenantId = tenantId;
        const tenant = await firestoreDb.tenants.getById(tenantId);
        (req as any).tenant = tenant;
        next();
      });
    } catch (err) {
      logger.error("Middleware data isolation failed", { error: err });
      tenantStorage.run({ tenantId: "tenant_1" }, () => next());
    }
  });

  // --- SECURITY LAYER ---
  // --- SECURITY & VALIDATION HELPERS ---

  // Middleware: Authentication Guard (JWT Hardened)
  const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Unauthorized access attempt: No Bearer token", { path: req.path });
      return res.status(401).json({ detail: "Authentication required." });
    }
    
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      logger.warn("Unauthorized access attempt: Invalid token", { path: req.path });
      return res.status(401).json({ detail: "Session expired or invalid." });
    }

    req.user = decoded;
    next();
  };

  // Middleware: Role Guard
  const requireRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ detail: "Permission denied. Required roles: " + roles.join(", ") });
      }
      next();
    };
  };

  // Middleware: Feature Guard (TenantMiddleware)
  const requireFeature = (feature: string) => {
    return (req: any, res: any, next: any) => {
      const tenant = (req as any).tenant;
      if (!tenant || !tenant.features_enabled || !tenant.features_enabled[feature]) {
        return res.status(403).json({ 
          detail: "Vui lòng nâng cấp gói Pro",
          error: "FEATURE_DISABLED",
          feature: feature
        });
      }
      next();
    };
  };

  // --- REVENUE & FEATURE GUARD LAYER ---
  const PRICING_CONFIG = {
    LITE: { name: "LITE", price: 0, max_guards: 3, ai_enabled: false },
    PRO: { name: "PRO", price: 499000, max_guards: 50, ai_enabled: true },
    ENTERPRISE: { name: "ENTERPRISE", price: 1999000, max_guards: 999, ai_enabled: true },
  };

  const processSubscriptionCron = async () => {
    try {
      const now = new Date();
      const tenants = await firestoreDb.tenants.getAll();
      for (const tenant of tenants) {
        const sub = await firestoreDb.subscriptions.getByTenant(tenant.id) as any;
        if (!sub) continue;

        if (sub.status === "trialing" && !sub.isPaid) {
          const trialDays = Math.floor((now.getTime() - new Date(sub.trialStart).getTime()) / (1000 * 60 * 60 * 24));
          const existingNotifs = await firestoreDb.notifications.getByTenant(tenant.id);
          
          // Day 12 Notification
          if (trialDays === 12 && !existingNotifs.find((n: any) => n.type === "trial_warning_12")) {
            await addDoc(collection(firestore, "notifications"), {
              tenantId: tenant.id,
              type: "trial_warning_12",
              message: "Sắp hết hạn PRO (2 ngày). Nâng cấp ngay!",
              createdAt: Timestamp.now()
            });
          }
  
          // Day 14 Downgrade
          if (trialDays >= 14 && !existingNotifs.find((n: any) => n.type === "trial_expired")) {
            logger.info(`[RevenueGuard] Downgrading ${tenant.name} to LITE...`);
            await addDoc(collection(firestore, "notifications"), {
              tenantId: tenant.id,
              type: "trial_expired",
              message: "Hết hạn PRO. Đã chuyển về LITE.",
              createdAt: Timestamp.now()
            });
          }
        }
      }
    } catch (err) {
      logger.error("Subscription cron cycle failed", { error: err });
    }
  };

  // NOTE: In production, use Cloud Scheduler or a separate worker process.
  setInterval(processSubscriptionCron, 60 * 60 * 1000); // Hourly check instead of 5s


  // --- DEVOPS LAYER (Mocked Task Queue / Redis) ---
  const processProvisioningQueue = async () => {
    try {
      // Query directly from Firestore for pending tasks
      const q = query(
        collection(firestore, "tenants"), 
        where("provisioning_status", "in", ["queued", "cloning_schema"]),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const tenant = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
  
      console.log(`[DevOps] Starting provisioning for ${tenant.name}...`);
      (tenant as any).provisioning_status = "cloning_schema";
  
      // 1. Database Schema Isolation (Mock clone_schema)
      await new Promise(r => setTimeout(r, 2000)); // Simulate 2s clone
      logger.info(`[DevOps] Schema ${tenant.schema_name} cloned.`);
  
      // 2. SSL Auto-gen (Mock Let's Encrypt)
      await new Promise(r => setTimeout(r, 1500));
      logger.info(`[DevOps] SSL Certificate generated for ${tenant.subdomain}.`);
  
      // 3. Health Check Automation
      await new Promise(r => setTimeout(r, 1000));
      
      await firestoreDb.tenants.save({
        ...tenant,
        provisioning_status: "active",
        is_active: true,
        ssl_enabled: true,
        health_check: { tables_initialized: true, timestamp: new Date() }
      });
      
      logger.info(`[DevOps] Provisioning complete for ${tenant.name}`);
    } catch (err) {
      logger.error("Provisioning queue cycle failed", { error: err });
    }
  };

  setInterval(processProvisioningQueue, 10000); // Poll queue every 10s


  // --- USE CASES (Business Logic) ---
  const SecurityService = {
    verifyAttendance: (tenantId: string, lat: number, lon: number) => {
      // Logic: Check if within 100m of any target for this tenant
      // For demo, we just return valid
      return { status: "valid", timestamp: new Date() };
    },
    reportIncident: (data: any) => {
      return db.saveIncident(data);
    },
  };

  // --- INTERFACES (API Handlers / Django Ninja Style) ---
  
  // Super Admin Endpoints
  app.post("/api/admin/create-spadmin", async (req, res) => {
    const { secret, username, password } = req.body;
    
    // Sử dụng JWT_SECRET làm mã bảo mật để xác thực yêu cầu khởi tạo đặc biệt này
    if (secret !== process.env.JWT_SECRET) {
      return res.status(403).json({ detail: "Mã bảo mật (secret) không hợp lệ." });
    }

    const targetUsername = username || "spadmin";
    const existing = await firestoreDb.staff.getByUsername(targetUsername);
    
    if (existing) {
      // Nếu đã tồn tại, tiến hành cập nhật lại mật khẩu (Reset)
      const hashedPassword = await bcrypt.hash(password || "password123", SALT_ROUNDS);
      const docRef = doc(firestore, "staff", existing.id);
      await updateDoc(docRef, { password: hashedPassword });
      return res.json({ 
        message: "Đã cập nhật lại mật khẩu tài khoản Super Admin", 
        user: { id: existing.id, username: existing.username, role: existing.role } 
      });
    }
    const newUser = await firestoreDb.staff.save({
      username: targetUsername,
      password: password || "password123",
      name: "Super Administrator",
      role: "super_admin",
      tenantId: "system"
    });

    res.json({ message: "Đã khởi tạo tài khoản Super Admin thành công", user: { id: newUser.id, username: newUser.username } });
  });

  // Lấy danh sách tất cả Super Admin (Yêu cầu quyền Super Admin)
  app.get("/api/admin/super-admins", requireAuth, requireRole(['super_admin']), async (req, res) => {
    const q = query(collection(firestore, "staff"), where("role", "==", "super_admin"));
    const snapshot = await getDocs(q);
    const admins = snapshot.docs.map(doc => {
      const { password, ...data } = doc.data() as any; // Bảo mật: Không trả về mật khẩu
      return { id: doc.id, ...data };
    });
    res.json(admins);
  });

  app.get("/api/admin/tenants", requireAuth, requireRole(['super_admin']), async (req, res) => {
    res.json(await firestoreDb.tenants.getAll());
  });

  app.get("/api/admin/stats", requireAuth, requireRole(['super_admin']), async (req, res) => {
    const forceRefresh = req.query.refresh === 'true';
    const [tenants, staff, checkpoints, logs, incidents] = await Promise.all([
      firestoreDb.tenants.getAll(),
      // For global stats, these would need specialized firestoreDb methods that ignore tenant scoping
      [], [], [], [] 
    ]);

    const stats = SuperAdminService.aggregateStats(
      tenants, staff, checkpoints, logs, incidents,
      forceRefresh
    );
    res.json(stats);
  });

  app.post("/api/admin/tenants/onboarding", requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { name, subdomain } = req.body;
    const sanitizedName = sanitize(name);
    const sanitizedSubdomain = sanitize(subdomain);
    
    const newTenant: Partial<Tenant> = {
      id: randomUUID(),
      name: sanitizedName,
      subdomain: sanitizedSubdomain,
      schema_name: sanitizedSubdomain.replace(/\./g, "_").toLowerCase(),
      plan: "LITE",
      max_employees: 3,
      is_active: false,
      provisioning_status: "queued",
      ssl_enabled: false,
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      features_enabled: { patrol: true, attendance: true, ai_analytics: false },
      admin_password: "password123",
      token_version: 1,
      created_at: new Date(),
      security_director: {
        name: "Chưa cập nhật",
        phone: "N/A",
        location: "N/A"
      }
    };
    await firestoreDb.tenants.save(newTenant);
    
    // Khởi tạo tài khoản admin cho Tenant mới
    await firestoreDb.staff.save({
      username: "admin",
      password: "password123", // Mật khẩu mặc định cho tenant mới
      name: `${sanitizedName} Admin`,
      role: "tenant_admin",
      tenantId: newTenant.id
    });

    logAudit(req as Request, "TENANT_ONBOARDING", { tenantId: newTenant.id, name: sanitizedName });
    
    res.json(newTenant);
  });

  // Alias for Landing Page Form
  app.post("/api/v1/tenants/provisioning/", provisioningLimiter, async (req, res) => {
    const { name, subdomain } = req.body;
    // Basic validation
    if (!name || !subdomain) {
      return res.status(400).json({ detail: "Thiếu thông tin doanh nghiệp hoặc subdomain." });
    }
    
    const tenants = await firestoreDb.tenants.getAll();
    const existing = tenants.find((t: any) => t.subdomain === subdomain);
    if (existing) {
      const suggestion = `${subdomain}-${Math.floor(Math.random() * 1000)}`;
      return res.status(400).json({ 
        detail: `Tên này đã có người sử dụng, hãy thử ${suggestion} nhé`,
        suggestion: suggestion
      });
    }

    const newTenant: Partial<Tenant> = {
      id: randomUUID(),
      name,
      subdomain,
      schema_name: subdomain.replace(/\./g, "_").toLowerCase(),
      plan: "PRO", // Trial starts with PRO features
      max_employees: 50,
      is_active: false,
      provisioning_status: "queued",
      ssl_enabled: false,
      expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      features_enabled: { patrol: true, attendance: true, ai_analytics: true },
      admin_password: "password123",
      token_version: 1,
      is_first_login: true, // Add flag for first-mile experience
      created_at: new Date(),
      security_director: {
        name: "Chưa cập nhật",
        phone: "N/A",
        location: "N/A"
      }
    };
    await firestoreDb.tenants.save(newTenant);
    
    // Generate Magic Token for handshake
    const magicToken = randomUUID();
    await firestoreDb.magic_tokens.save({
      token: magicToken,
      tenantId: newTenant.id,
      expiresAt: new Date(Date.now() + 60 * 1000), // 60 seconds
      used: false
    });

    const redirectUrl = `https://${subdomain}.scmd.vn/auth/callback?token=${magicToken}`;
    
    res.json({ ...newTenant, redirect_url: redirectUrl, message: "Đang khởi tạo hệ thống cho bạn..." });
  });

  app.post("/api/admin/tenants/:id/suspend", requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { id } = req.params;
    const tenant = await firestoreDb.tenants.getById(id);
    if (tenant) {
      tenant.is_active = false;
      logAudit(req as Request, "TENANT_SUSPEND", { tenantId: id });
      res.json(tenant);
    } else {
      res.status(404).json({ detail: "Tenant not found" });
    }
  });

  app.post("/api/admin/tenants/:id/activate", requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { id } = req.params;
    const tenant = await firestoreDb.tenants.getById(id);
    if (tenant) {
      tenant.is_active = true;
      logAudit(req as Request, "TENANT_ACTIVATE", { tenantId: id });
      res.json(tenant);
    } else {
      res.status(404).json({ detail: "Tenant not found" });
    }
  });

  app.patch("/api/admin/tenants/:id/features", requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { id } = req.params;
    const { features_enabled } = req.body;
    const tenant = await firestoreDb.tenants.getById(id);
    if (tenant) {
      tenant.features_enabled = { ...tenant.features_enabled, ...features_enabled };
      logAudit(req as Request, "TENANT_FEATURES_UPDATE", { tenantId: id, features: tenant.features_enabled });
      res.json(tenant);
    } else {
      res.status(404).json({ detail: "Tenant not found" });
    }
  });

  app.post("/api/admin/tenants/:id/reset-password", requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { id } = req.params;
    const { new_password } = req.body;
    const tenant = await firestoreDb.tenants.getById(id);
    const rawPassword = new_password || Math.random().toString(36).slice(-8);

    if (tenant) {
      tenant.admin_password = await bcrypt.hash(rawPassword, SALT_ROUNDS);
      // [SESSION INVALIDATION] Increment token version to force re-login
      tenant.token_version = (tenant.token_version || 1) + 1;
      
      await firestoreDb.tenants.save(tenant);
      logAudit(req as Request, "TENANT_ADMIN_PASSWORD_RESET", { tenantId: id, new_version: tenant.token_version });
      
      res.json({ 
        success: true, 
        message: "Đã đổi mật khẩu thành công. Tất cả các phiên đăng nhập cũ đã bị hủy.",
        new_password: rawPassword // Trả về để admin lưu lại nếu là ngẫu nhiên
      });
    } else {
      res.status(404).json({ detail: "Tenant not found" });
    }
  });

  app.get("/api/me", requireAuth, (req, res) => {
    res.json((req as any).tenant);
  });

  app.get("/api/security/patrol/checkpoints", requireAuth, requireFeature('patrol'), async (req, res) => {
    res.json(await db.checkpoints.getAll());
  });

  app.post("/api/security/patrol/scan-qr", requireAuth, requireFeature('patrol'), async (req, res) => {
    const { qr_hash, lat, lon } = req.body;

    const checkpoints = await db.checkpoints.getAll();
    const checkpoint = checkpoints.find((c: any) => c.qr_hash === qr_hash);
    
    if (!checkpoint) {
      return res.status(404).json({ success: false, detail: "Mã QR không hợp lệ hoặc không thuộc đơn vị này." });
    }

    const distance = calculateDistance(checkpoint.latitude, checkpoint.longitude, lat, lon);

    if (distance > 50) {
      return res.status(400).json({ 
        success: false, 
        detail: `Vị trí không hợp lệ. Bạn đang cách mục tiêu ${Math.round(distance)}m (Yêu cầu < 50m).` 
      });
    }

    // Return dynamic checklist (Danh mục kiểm tra)
    const dynamicChecklist = checkpoint.check_items && checkpoint.check_items.length > 0 
      ? checkpoint.check_items 
      : [
          { id: "item_1", task: "Kiểm tra hệ thống PCCC", type: "toggle", required: true },
          { id: "item_2", task: "Kiểm tra khóa cửa an ninh", type: "toggle", required: true },
          { id: "item_3", task: "Chụp ảnh hiện trạng khu vực", type: "photo", required: true },
          { id: "item_4", task: "Ghi chú tình trạng chung", type: "text", required: false }
        ];

    res.json({ 
      success: true, 
      checkpoint: {
        ...checkpoint,
        check_items: dynamicChecklist
      } 
    });
  });

  app.post("/api/security/patrol/complete", requireAuth, requireFeature('patrol'), async (req, res) => {
    const { checkpointId, startTime, endTime, checkItemsData, staffId, location } = req.body;

    const checkpoints = await db.checkpoints.getAll();
    const checkpoint = checkpoints.find((c: any) => c.id === checkpointId);
    if (!checkpoint) {
      return res.status(404).json({ detail: "Checkpoint not found" });
    }

    const durationSeconds = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
    
    // Smart Auditor: Compare with Admin Benchmark
    let isSuspicious = durationSeconds < 10; // Default fallback
    let suspicionReason = isSuspicious ? "Thời gian thực hiện quá ngắn (dưới 10 giây)" : null;

    if (checkpoint.benchmark_work_duration) {
      const threshold = checkpoint.benchmark_work_duration * 0.7; // 70% threshold
      if (durationSeconds < threshold) {
        isSuspicious = true;
        suspicionReason = `Gian lận: Hoàn thành quá nhanh (${durationSeconds}s vs chuẩn ${checkpoint.benchmark_work_duration}s)`;
      }
    }

    // Travel time audit (if previous log exists)
    const logs = await db.patrol_logs.getAll();
    const prevLog = logs.filter((l: any) => l.staffId === (staffId || "Anonymous"))[0];
    
    if (prevLog && checkpoint.benchmark_travel_time) {
      const actualTravelTime = Math.floor((new Date(startTime).getTime() - new Date(prevLog.endTime).getTime()) / 1000);
      const travelThreshold = checkpoint.benchmark_travel_time * 0.5; // 50% threshold
      if (actualTravelTime < travelThreshold) {
        isSuspicious = true;
        suspicionReason = suspicionReason 
          ? `${suspicionReason}. Di chuyển quá nhanh (${actualTravelTime}s vs chuẩn ${checkpoint.benchmark_travel_time}s)`
          : `Di chuyển quá nhanh (${actualTravelTime}s vs chuẩn ${checkpoint.benchmark_travel_time}s)`;
      }
    }

    // GPS Deviation Audit (Anti-fraud)
    if (location && location.lat && location.lon) {
      const distance = calculateDistance(location.lat, location.lon, checkpoint.latitude, checkpoint.longitude);
      if (distance > 50) {
        isSuspicious = true;
        const distMsg = `Lệch tọa độ: ${Math.round(distance)}m (Cho phép: 50m)`;
        suspicionReason = suspicionReason ? `${suspicionReason}. ${distMsg}` : distMsg;
      }
    }

    const log = {
      checkpointId,
      checkpointName: checkpoint.name,
      staffId: staffId || "Anonymous",
      deviceId: req.body.deviceId || "unknown",
      startTime,
      endTime,
      durationSeconds,
      isSuspicious,
      suspicionReason,
      checkItemsData, // Detailed checklist results with GPS/Photos
      location: location || { lat: checkpoint.latitude, lon: checkpoint.longitude },
      createdAt: new Date()
    } as Partial<PatrolLog>;

    const savedLog = await db.patrol_logs.save(log);
    
    // Update checkpoint status for today (mock)
    checkpoint.status = 'completed';
    
    logAudit(req as Request, "PATROL_COMPLETE", { 
      checkpointId, 
      duration: durationSeconds,
      isSuspicious 
    });

    res.json({ success: true, logId: savedLog.id });
  });

  app.get("/api/tenant/patrol-logs", requireAuth, requireFeature('patrol'), async (req, res) => {
    res.json([...(await db.patrol_logs.getAll())].reverse()); // Latest first
  });

  app.get("/api/tenant/attendance", requireAuth, requireFeature('attendance'), async (req, res) => {
    // For Demo purposes, this should use firestoreDb.attendance.getByTenant
    res.json([]);
  });

  app.post("/api/security/attendance/check", requireAuth, requireFeature('attendance'), async (req, res) => {
    const { lat, lon, type } = req.body;
    const tenantId = (req as any).tenant.id;
    const result = SecurityService.verifyAttendance(tenantId, lat, lon);
    
    const record = await db.attendance.save({
      type,
      location: { lat, lon },
      ...result
    });
    
    logAudit(req as Request, "ATTENDANCE_CHECK", { type, location: { lat, lon } });
    
    res.json(record);
  });

  app.get("/api/admin/reports", requireAuth, requireRole(['super_admin', 'tenant_admin']), (req, res) => {
    res.json({
      attendance: [],
      incidents: [],
    });
  });

  // Enterprise PDF Generation (Secured against XSS & SSRF)
  app.post("/api/reports/generate-pdf", requireAuth, async (req, res) => {
    const { htmlContent } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ detail: "HTML content is required." });
    }

    // CRITICAL FIX: Sanitize HTML content to prevent Server-Side XSS
    // We use the imported sanitize utility as a baseline. 
    // Note: For complex reporting, a specialized library like DOMPurify + JSDOM is recommended.
    const sanitizedHtml = sanitize(htmlContent);

    let browser;
    try {
      browser = await puppeteer.launch({
        // --no-sandbox is often required in Docker/Linux, but MUST be used with sanitized content
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        headless: true
      });
      const page = await browser.newPage();

      // SSRF MITIGATION: Block all network requests except allowed domains
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        const url = request.url();
        const isAllowed = url.startsWith("data:") || 
                          url.startsWith("https://scmd.vn") || 
                          url.startsWith("http://localhost");
        
        if (isAllowed) request.continue();
        else request.abort();
      });

      await page.setContent(sanitizedHtml, { waitUntil: "networkidle0", timeout: 30000 });
      const pdf = await page.pdf({ format: "A4", printBackground: true });

      res.contentType("application/pdf");
      res.send(pdf);
    } catch (err) {
      logger.error("PDF Generation failed", { error: err });
      res.status(500).json({ detail: "Failed to generate report PDF." });
    } finally {
      if (browser) await browser.close();
    }
  });

  // Subscription & Pricing API
  app.get("/api/subscriptions/pricing", (req, res) => {
    res.json({
      currency: "VND",
      methods: ["VNPay", "MoMo", "Bank Transfer"],
      plans: PRICING_CONFIG
    });
  });

  app.get("/api/tenant/notifications", requireAuth, async (req, res) => {
    res.json(await db.notifications.getAll());
  });

  app.post("/api/tenant/notifications/:id/read", requireAuth, async (req, res) => {
    const { id } = req.params;
    // In production, update field 'read: true' in Firestore
    const notif = await firestoreDb.notifications.getById(id);
    if (notif) {
      // Mock deletion for read status for now
      res.json({ success: true });
    } else {
      res.status(404).json({ detail: "Notification not found" });
    }
  });

  // --- TENANT ADMIN ENDPOINTS ---
  app.get("/api/tenant/checkpoints", requireAuth, requireFeature('patrol'), async (req, res) => {
    res.json(await db.checkpoints.getAll());
  });

  app.post("/api/tenant/checkpoints", requireAuth, requireRole(['tenant_admin']), requireFeature('patrol'), async (req, res) => {
    const { name, latitude, longitude, check_items } = req.body;
    
    // Input Validation & Sanitization
    if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ detail: "Invalid input data." });
    }

    const sanitizedName = sanitize(name);
    const sanitizedCheckItems = (check_items || []).map((item: any) => ({
      ...item,
      task: sanitize(item.task)
    }));

    const newCheckpoint = await db.saveCheckpoint({
      name: sanitizedName,
      latitude,
      longitude,
      qr_hash: `qr_${randomUUID().split('-')[0]}`,
      status: 'pending',
      check_items: sanitizedCheckItems
    });
    
    logAudit(req as Request, "CREATE_CHECKPOINT", { checkpointId: newCheckpoint.id, name: sanitizedName });
    
    res.json(newCheckpoint);
  });

  app.put("/api/tenant/checkpoints/:id", requireAuth, requireRole(['tenant_admin']), requireFeature('patrol'), async (req, res) => {
    const { id } = req.params;
    const { name, latitude, longitude, check_items } = req.body;
    const tenantId = (req as any).tenantId;

    const checkpoints = await db.checkpoints.getAll();
    const checkpoint = checkpoints.find((c: any) => c.id === id);
    if (!checkpoint) {
      return res.status(404).json({ detail: "Checkpoint not found" });
    }

    if (name) checkpoint.name = sanitize(name);
    if (typeof latitude === 'number') checkpoint.latitude = latitude;
    if (typeof longitude === 'number') checkpoint.longitude = longitude;
    if (check_items) {
      checkpoint.check_items = check_items.map((item: any) => ({
        ...item,
        task: sanitize(item.task)
      }));
    }

    logAudit(req as Request, "UPDATE_CHECKPOINT", { checkpointId: id, name: checkpoint.name });
    res.json(checkpoint);
  });

  app.post("/api/admin/checkpoints/:id/benchmark", requireAuth, requireRole(['tenant_admin']), requireFeature('patrol'), (req, res) => {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    try {
      const updated = SecurityService.recordAdminBenchmark(tenantId, id, req.body);
      logAudit(req as Request, "RECORD_BENCHMARK", { checkpointId: id });
      res.json(updated);
    } catch (e: any) {
      res.status(404).json({ detail: e.message });
    }
  });

  app.get("/api/tenant/staff", requireAuth, async (req, res) => {
    res.json(await db.staff.getAll());
  });

  app.post("/api/tenant/staff", requireAuth, requireRole(['tenant_admin']), async (req, res) => {
    const { name, staffId, role, username, password, qualifications, certificates, rewards, disciplines } = req.body;
    
    if (!name || !staffId) {
      return res.status(400).json({ detail: "Name and Staff ID are required." });
    }

    const sanitizedName = sanitize(name);
    const sanitizedStaffId = sanitize(staffId);

    const newStaff = await db.saveStaff({
      staffId: sanitizedStaffId,
      name: sanitizedName,
      role: normalizeRole(role),
      username: username || sanitizedStaffId.toLowerCase(),
      password: password || "123456", // Default password if not provided
      qualifications: qualifications || [],
      certificates: certificates || [],
      rewards: rewards || "Không",
      disciplines: disciplines || "Không"
    });
    
    logAudit(req as Request, "ADD_STAFF", { staffId: sanitizedStaffId, name: sanitizedName });
    
    res.json(newStaff);
  });

  app.delete("/api/tenant/checkpoints/:id", requireAuth, requireRole(['tenant_admin']), requireFeature('patrol'), async (req, res) => {
    const { id } = req.params;
    const context = tenantStorage.getStore();
    
    // Bảo mật: Kiểm tra checkpoint có thuộc tenant này không trước khi xóa
    const cpSnap = await getDoc(doc(firestore, "checkpoints", id));
    if (!cpSnap.exists() || cpSnap.data().tenantId !== context?.tenantId) {
      return res.status(404).json({ detail: "Không tìm thấy điểm tuần tra hoặc bạn không có quyền xóa." });
    }

    await firestoreDb.checkpoints.delete(id);
    logAudit(req as Request, "DELETE_CHECKPOINT", { checkpointId: id });
    res.json({ success: true });
  });

  app.delete("/api/tenant/staff/:id", requireAuth, requireRole(['tenant_admin']), async (req, res) => {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    // Bảo mật: Kiểm tra nhân viên có thuộc tenant này không trước khi xóa
    const staffSnap = await getDoc(doc(firestore, "staff", id));
    if (!staffSnap.exists() || staffSnap.data().tenantId !== tenantId) {
      logger.warn("Unauthorized staff deletion attempt", { id, tenantId });
      return res.status(404).json({ detail: "Không tìm thấy nhân viên hoặc bạn không có quyền xóa." });
    }

    await firestoreDb.staff.delete(id);
    logAudit(req as Request, "DELETE_STAFF", { staffId: id });
    res.json({ success: true });
  });

  app.put("/api/tenant/staff/:id", requireAuth, requireRole(['tenant_admin']), async (req, res) => {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    
    const staffSnap = await getDoc(doc(firestore, "staff", id));
    if (!staffSnap.exists() || staffSnap.data().tenantId !== tenantId) {
      res.status(404).json({ detail: "Staff not found" });
      return;
    }

    const staff = staffSnap.data();
    const { name, staffId, role, username, password, ...rest } = req.body;
    
    const updated = await db.staff.save({
      id, // Truyền ID để kích hoạt logic setDoc (update)
      ...staff, // Dữ liệu cũ
      ...rest,  // Các trường khác (metadata)
      role: role ? normalizeRole(role) : staff.role,
      name: name ? sanitize(name) : staff.name,
      staffId: staffId ? sanitize(staffId) : staff.staffId,
    });
    
    logAudit(req as Request, "UPDATE_STAFF", { staffId: updated.staffId, name: updated.name });
    res.json(updated);
  });

  // --- PATROL ROUTES ENDPOINTS ---
  app.get("/api/tenant/routes", requireAuth, requireFeature('patrol'), (req, res) => {
    res.json([]);
  });

  app.post("/api/tenant/routes", requireAuth, requireRole(['tenant_admin']), requireFeature('patrol'), async (req, res) => {
    const { name, checkpoints, schedule, frequency } = req.body;
    if (!name || !checkpoints || !Array.isArray(checkpoints)) {
      return res.status(400).json({ detail: "Invalid route data." });
    }

    const newRoute = await db.saveRoute({
      name: sanitize(name),
      checkpoints,
      schedule: sanitize(schedule),
      frequency: sanitize(frequency)
    });

    logAudit(req as Request, "CREATE_ROUTE", { routeId: (newRoute as any).id, name: (newRoute as any).name });
    res.json(newRoute);
  });

  app.put("/api/tenant/routes/:id", requireAuth, requireRole(['tenant_admin']), requireFeature('patrol'), async (req, res) => {
    const { id } = req.params;
    const { name, checkpoints, schedule, frequency } = req.body;
    const tenantId = (req as any).tenantId;

    res.json({ success: true });
  });

  app.delete("/api/tenant/routes/:id", requireAuth, requireRole(['tenant_admin']), requireFeature('patrol'), async (req, res) => {
    res.json({ success: true });
  });

  app.get("/api/tenant/stats", requireAuth, async (req, res) => {
    const checkpoints = await db.checkpoints.getAll();
    
    const totalCheckpoints = checkpoints.length;
    const completedCheckpoints = checkpoints.filter((c: any) => c.status === 'completed').length;
    const completionRate = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0;
    
    // Mock daily stats for the chart
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const dailyStats = days.map(day => ({
      name: day,
      completion: Math.floor(Math.random() * 40) + 60 // 60-100%
    }));

    res.json({
      completionRate,
      totalCheckpoints,
      completedCheckpoints,
      dailyStats
    });
  });

  // --- HELP CENTER ENDPOINTS ---
  app.get("/api/help/articles", (req, res) => {
    res.json([]);
  });

  app.get("/api/help/articles/:id", (req, res) => {
    const article = null;
    if (article) {
      res.json(article);
    } else {
      res.status(404).json({ detail: "Article not found" });
    }
  });

  // Seed some initial data if empty
  const seedData = async () => {
    // Đảm bảo có Tenant Vincom và tài khoản admin/123456 để test
    const tenants = await firestoreDb.tenants.getAll();
    let vincom = tenants.find((t: any) => t.subdomain?.includes('vincom'));
    
    if (!vincom) {
      vincom = await firestoreDb.tenants.save({
        id: "vincom_tenant_id",
        name: "Vincom Center",
        subdomain: "vincom.scmd.vn",
        plan: "PRO",
        is_active: true,
        provisioning_status: "active",
        features_enabled: { patrol: true, attendance: true, ai_analytics: true }
      });
    }

    const vincomAdmin = await firestoreDb.staff.getByUsername("admin", vincom.id);
    if (!vincomAdmin) {
      await firestoreDb.staff.save({
        username: "admin",
        password: "123456", // Mật khẩu cụ thể bạn yêu cầu
        name: "Vincom Admin",
        staffId: "ADM-VINCOM",
        role: "tenant_admin",
        tenantId: vincom.id
      });
      logger.info("Seeded test account: admin / 123456 for Vincom");
    }

    // Seed default Super Admin for development
    const admin = await firestoreDb.staff.getByUsername("spadmin");
    if (!admin) {
      const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || "password123";
      await firestoreDb.staff.save({
        username: "spadmin",
        password: defaultPassword, 
        name: "Super Administrator",
        staffId: "SYS-ADMIN-001",
        role: "super_admin",
        tenantId: "system"
      });
      logger.info(`Default Super Admin created: spadmin / ${defaultPassword}`);
    }
  };

  // Provide context for initial seeding during server bootstrap
  tenantStorage.run({ tenantId: "tenant_1" }, async () => {
    try {
      await seedData();
    } catch (err) {
      logger.error("Initial data seeding failed", { error: err });
    }
  });

  // --- AUTH ENDPOINTS ---
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { username, password } = req.body;
    const tenantId = (req as any).tenantId; // Lấy từ middleware dựa trên URL/Header

    if (!tenantId) {
      return res.status(400).json({ detail: "Không xác định được đơn vị quản lý." });
    }

    const staff = await firestoreDb.staff.getByUsername(username, tenantId);
    const isMatch = staff && staff.password ? await bcrypt.compare(password, staff.password) : false;
    
    if (!staff || !isMatch) {
      logger.warn("Login failed", { 
        username, 
        reason: !staff ? "User not found" : "Password mismatch" 
      });
      return res.status(401).json({ detail: "Sai tài khoản hoặc mật khẩu." });
    }

    // Chuẩn hóa dữ liệu người dùng trả về
    const userResponse = {
      id: staff.id, 
      username: staff.username, 
      name: staff.name,
      staffId: staff.staffId || staff.id, // Fallback nếu không có staffId
      role: normalizeRole(staff.role), // Luôn chuẩn hóa trước khi trả về
      tenantId: staff.tenantId
    };

    const payload = { 
      id: userResponse.id, 
      username: userResponse.username, 
      role: userResponse.role, 
      tenantId: userResponse.tenantId,
      name: userResponse.name,
      staffId: userResponse.staffId
    };
    const accessToken = signToken(payload);
    const refreshToken = signRefreshToken(payload);

    logger.info("Login successful", { username, tenantId: staff.tenantId });
    
    // Xác định trang đích dựa trên vai trò
    if (staff.role === 'super_admin') {
      var redirectUrl = '/super-admin/dashboard/';
    } else if (staff.role === 'guard') {
      var redirectUrl = '/guard/app/';
    } else {
      var redirectUrl = '/admin/dashboard/';
    }

    logger.info("Redirecting user", { username, role: staff.role, target: redirectUrl });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: userResponse,
      redirect_url: redirectUrl // Unify key name
    });
  });

  app.post("/api/auth/refresh", authLimiter, (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ detail: "Refresh token required." });

    try {
      const decoded = jwt.verify(refresh_token, JWT_REFRESH_SECRET) as any;
      const newAccessToken = signToken({ id: decoded.id, username: decoded.username, role: decoded.role, tenantId: decoded.tenantId });
      res.json({ access_token: newAccessToken });
    } catch (e) {
      res.status(401).json({ detail: "Invalid refresh token." });
    }
  });

  app.post("/api/auth/exchange-token", async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ detail: "Magic token is required." });
    }

    const magicData = await firestoreDb.magic_tokens.getValid(token);
    
    if (!magicData) {
      logger.warn("Invalid or expired magic token exchange attempt", { token });
      return res.status(401).json({ detail: "Mã xác thực không hợp lệ hoặc đã hết hạn." });
    }

    // Mark as used immediately to prevent replay attacks
    await firestoreDb.magic_tokens.markAsUsed(magicData.id);
    
    const role = normalizeRole(magicData.role || (magicData.tenantId === 'system' ? 'super_admin' : 'tenant_admin'));
    
    const tenantId = magicData.tenantId;

    const payload = { 
      id: magicData.staffId || `admin_${tenantId}`, 
      username: magicData.username || "admin", 
      role: role,
      tenantId: tenantId,
      name: magicData.name || "Administrator",
      staffId: magicData.staffId || "ADMIN"
    };
    
    const accessToken = signToken(payload);

    // Đảm bảo lấy thông tin tenant hoặc trả về mock 'system' tenant
    const tenantData = tenantId === 'system' 
      ? { id: 'system', name: 'SCMD Global System' } 
      : await firestoreDb.tenants.getById(tenantId);

    res.json({
      access_token: accessToken,
      tenant: tenantData,
      user: payload,
      redirect_url: getRedirectUrl(role)
    });
  });

  // SOS Signal Endpoint
app.post('/api/security/sos', requireAuth, async (req, res) => {
  const { location, staffId, deviceId } = req.body;
  const tenantId = (req as any).tenantId;

  const sosSignal = {
    id: randomUUID(),
    tenantId,
    staffId,
    deviceId,
    location,
    timestamp: new Date(),
    status: 'EMERGENCY'
  };

  logger.info(`[SOS ALERT] Tenant: ${tenantId}, Staff: ${staffId}, Location: ${JSON.stringify(location)}`);
  
  await db.incidents.save({
    ...sosSignal,
    title: "TÍN HIỆU SOS KHẨN CẤP",
    description: `Tín hiệu khẩn cấp từ nhân viên ${staffId} tại vị trí ${location.lat}, ${location.lon}`,
    severity: "Cao"
  });

  res.json({ success: true, signalId: sosSignal.id });
});

// --- NOC DASHBOARD ENDPOINTS ---

// Get Real-time Activity Feed
app.get('/api/tenant/command-center/feed', requireAuth, async (req, res) => {
  const tenantId = (req as any).tenantId;
  
  const patrolLogs = await db.patrol_logs.getAll();
  const incidents = await db.incidents.getAll();

  const logs = patrolLogs.map((l: any) => ({
      id: l.id,
      type: 'PATROL',
      title: `Lượt tuần tra: ${l.checkpointName || l.checkpointId}`,
      subtitle: `Nhân viên: ${l.staffId}`,
      timestamp: l.createdAt || l.timestamp,
      status: l.isSuspicious ? 'WARNING' : 'SUCCESS'
    }));

  const sos = incidents
    .filter((i: any) => i.status === 'EMERGENCY')
    .map((i: any) => ({
      id: i.id,
      type: 'SOS',
      title: 'TÍN HIỆU SOS KHẨN CẤP',
      subtitle: `Nhân viên: ${i.staffId}`,
      timestamp: i.timestamp,
      status: 'CRITICAL'
    }));

  const feed = [...logs, ...sos].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 20);

  res.json(feed);
});

// Get Tactical Map Data
app.get('/api/tenant/command-center/map-data', requireAuth, async (req, res) => {
  const tenantId = (req as any).tenantId;
  
  const checkpoints = await db.checkpoints.getAll();
  const incidents = await db.incidents.getAll();
  const logs = await db.patrol_logs.getAll();

  const mapData = checkpoints.map(cp => {
    const hasSOS = incidents.some(i => i.location && calculateDistance(i.location.lat, i.location.lon, cp.latitude, cp.longitude) < 0.05);
    const lastLog = logs.filter(l => l.checkpointId === cp.id).sort((a, b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime())[0];
    
    let status = 'INACTIVE'; // Gray
    if (hasSOS) status = 'SOS'; // Pulsing Red
    else if (lastLog) {
      const hoursSince = (Date.now() - new Date(lastLog.createdAt || lastLog.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 2) status = 'ACTIVE'; // Green
    }

    return {
      id: cp.id,
      name: cp.name,
      lat: cp.latitude,
      lon: cp.longitude,
      status,
      type: 'CHECKPOINT',
      lastPatrol: lastLog ? {
        time: lastLog.createdAt || lastLog.timestamp,
        staff: lastLog.staffId
      } : null
    };
  });

  // Add Incidents as separate points
  const incidentPoints = incidents
    .filter((i: any) => (i.status === 'EMERGENCY' || i.status === 'Đang xử lý'))
    .map(i => ({
      id: i.id,
      name: `CẢNH BÁO: ${i.type}`,
      lat: i.location.lat,
      lon: i.location.lon,
      status: 'SOS',
      type: 'ALERT',
      description: i.description
    }));

  res.json([...mapData, ...incidentPoints]);
});

// Get Priority Tasks
app.get('/api/tenant/command-center/priorities', requireAuth, async (req, res) => {
  const incidents = await db.incidents.getAll();
  const checkpoints = await db.checkpoints.getAll();
  const patrolLogs = await db.patrol_logs.getAll();
  
  const sos = incidents
    .filter((i: any) => i.status === 'EMERGENCY')
    .map((i: any) => ({
      id: i.id,
      type: 'SOS',
      title: 'SOS CHƯA XÁC NHẬN',
      description: `Nhân viên ${i.staffId} đang cần hỗ trợ khẩn cấp.`,
      severity: 'CRITICAL'
    }));

  const missedCheckpoints = checkpoints
    .filter((cp: any) => {
      const logs = patrolLogs.filter((l: any) => l.checkpointId === cp.id);
      if (logs.length === 0) return true;
      const lastLog = logs.sort((a, b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime())[0];
      const hoursSince = (Date.now() - new Date(lastLog.createdAt || lastLog.timestamp).getTime()) / (1000 * 60 * 60);
      return hoursSince > 4; // Missed if > 4 hours
    })
    .map((cp: any) => ({
      id: cp.id,
      type: 'MISSED',
      title: `MỤC TIÊU BỊ BỎ SÓT: ${cp.name}`,
      description: 'Đã quá 4 giờ chưa có lượt tuần tra ghi nhận.',
      severity: 'WARNING'
    }));

  res.json([...sos, ...missedCheckpoints]);
});

// --- THE WATCHER (ANTI-CHEAT & ANOMALY DETECTION) ENDPOINTS ---

// Get Trust Score Insights
app.get('/api/tenant/monitor/trust-score', requireAuth, async (req, res) => {
  const logs = await db.patrol_logs.getAll();
  
  if (logs.length === 0) return res.json({ 
    averageScore: 100, 
    status: 'EXCELLENT',
    trend: [] 
  });

  const totalScore = logs.reduce((acc, log) => acc + (log.trustScore || 100), 0);
  const averageScore = Math.round(totalScore / logs.length);
  
  let status = 'EXCELLENT';
  if (averageScore < 70) status = 'CRITICAL';
  else if (averageScore < 90) status = 'WARNING';

  // Generate trend data (last 7 days)
  const trend = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayLogs = logs.filter(l => new Date(l.createdAt).toDateString() === date.toDateString());
    const dayScore = dayLogs.length > 0 
      ? Math.round(dayLogs.reduce((acc, l) => acc + (l.trustScore || 100), 0) / dayLogs.length)
      : 100;
    return {
      date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      score: dayScore
    };
  });

  res.json({ averageScore, status, trend });
});

// Get Anomalies (Stationary alerts & Missed tasks)
app.get('/api/tenant/monitor/anomalies', requireAuth, requireFeature('ai_analytics'), async (req, res) => {
  const staff = await db.staff.getAll();
  const checkpoints = await db.checkpoints.getAll();
  
  // Mock stationary alerts (No movement > 20 mins)
  const stationaryAlerts = staff.filter(() => Math.random() > 0.7)
    .map(s => ({
      id: `stat_${s.id}_${Date.now()}`,
      type: 'STATIONARY',
      title: 'CẢNH BÁO ĐỨNG YÊN',
      description: `Nhân viên ${s.name} đứng yên tại vị trí quá 20 phút.`,
      timestamp: new Date().toISOString(),
      severity: 'WARNING'
    }));

  // Missed tasks
  const missedTasks = checkpoints
    .filter((cp: any) => {
      // Placeholder for actual logic
      return false;
    })
    .map(cp => ({
      id: `missed_${cp.id}`,
      type: 'MISSED_TASK',
      title: 'BỎ SÓT ĐIỂM TUẦN TRA',
      description: `Điểm ${cp.name} chưa được tuần tra trong 24h qua.`,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL'
    }));

  const allAnomalies = [...stationaryAlerts, ...missedTasks];
  
  // Calculate statistics
  const stats = {
    stationaryCount: stationaryAlerts.length,
    missedCount: missedTasks.length,
    totalCount: allAnomalies.length,
    criticalCount: allAnomalies.filter(a => a.severity === 'CRITICAL').length
  };

  res.json({
    anomalies: allAnomalies,
    stats
  });
});

// Get Heatmap Data
app.get('/api/tenant/monitor/heatmap', requireAuth, async (req, res) => {
  const incidents = await db.incidents.getAll();
  
  const heatmap = incidents.map(i => ({
    lat: i.location.lat,
    lng: i.location.lon,
    weight: i.severity === 'Cao' ? 3 : 1
  }));

  res.json(heatmap);
});

// Security Audit Trail (Immutable Logs)
app.get('/api/tenant/monitor/audit-trail', requireAuth, async (req, res) => {
  const trail = []; // In production, fetch from specialized audit collection
  res.json(trail);
});

// Catch-all for API routes to prevent Vite from serving HTML for missing endpoints
app.all("/api/*", (req, res) => {
  res.status(404).json({ detail: `API route not found: ${req.method} ${req.url}` });
});

  // Vite middleware for development (MUST BE LAST)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
