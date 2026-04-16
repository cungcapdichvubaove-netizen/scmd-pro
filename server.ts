import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { AsyncLocalStorage } from "async_hooks";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
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

// CHÚ Ý: Luôn thêm .js vào cuối file import cục bộ để chạy được trên Node ESM (Render)
import { db as firestore } from "./src/lib/firebase.js";
import { SuperAdminService } from "./src/apps/core/application/services/SuperAdminService.js";
import { sanitize } from "./src/shared/utils/security.js";
import { calculateDistance } from "./src/shared/utils/geo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- INTERFACES (Giữ nguyên các interface của bạn) ---
interface Tenant {
  id: string; name: string; subdomain: string; schema_name: string;
  plan: string; max_employees: number; is_active: boolean;
  provisioning_status: string; features_enabled: any; token_version: number;
}

// --- AUTH UTILS ---
const JWT_SECRET = process.env.JWT_SECRET as string;
const verifyToken = (token: string) => {
  try { return jwt.verify(token, JWT_SECRET); } catch (e) { return null; }
};

const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Render sẽ cấp PORT qua biến môi trường, mặc định dùng 3000 nếu chạy máy cá nhân
  const PORT = process.env.PORT || 3000;

  // Cấu hình Socket.io dùng chung cổng với HTTP
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.on("connection", (socket) => {
    socket.on("join_tenant", (tenantId) => socket.join(`tenant_${tenantId}`));
    socket.on("sos_signal", (data) => io.to(`tenant_${data.tenantId}`).emit("sos_alert", data));
  });

  // --- MIDDLEWARE ---
  app.use(cors({ 
    origin: ["https://scmd-pro.onrender.com", "http://localhost:5173"], 
    credentials: true 
  }));
  app.use(express.json());

  // --- DATA ISOLATION (Tenant Middleware) ---
  app.use(async (req, res, next) => {
    let tenantId = req.headers["x-tenant-id"] as string || "tenant_1";
    tenantStorage.run({ tenantId }, () => {
      (req as any).tenantId = tenantId;
      next();
    });
  });

  // --- API ROUTES (Ví dụ) ---
  app.get("/api/health", (req, res) => res.json({ status: "ok", port: PORT }));

  // --- PHẦN QUAN TRỌNG: SERVE FRONTEND (Fix Bad Gateway) ---
  // Khi deploy, Vite sẽ build vào thư mục dist/client
  const clientPath = path.join(__dirname, 'client');
  app.use(express.static(clientPath));

  // Tất cả các request không phải API sẽ trả về file index.html của React
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientPath, 'index.html'), (err) => {
      if (err) res.status(200).send("SCMD Backend is running. Frontend build not found.");
    });
  });

  // --- KHỞI CHẠY ---
  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 SCMD-PRO System is booming on port ${PORT}`);
  });

  // Chống lỗi EADDRINUSE
  httpServer.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} bị chiếm dụng. Đang dừng tiến trình để Render khởi động lại...`);
      process.exit(1);
    }
  });
}

startServer().catch(console.error);