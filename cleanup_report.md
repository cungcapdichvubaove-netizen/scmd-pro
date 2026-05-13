# SCMD Pro - Cleanup Candidate Report (v4.33.24)
***

## 1. Overview
Through static analysis using `knip` and deep codebase inspection, we have identified multiple candidate files for archiving up to version `v4.33.24`.
Suspicious and identified unused files have been relocated to `/_archive_cleanup_candidate/` for safe retention without risking accidental immediate deletion.

## 2. File Analysis

### 🟢 Safe to Remove (Low Risk)
These files represent legacy structural artifacts or duplication that are completely detached from entry points and runtime:

- `/src/pages/AdminDashboard.tsx`, `/src/pages/Dashboard.tsx`
  - **Reason:** Legacy routing elements. Superseded by `src/apps/superadmin/interfaces/SuperAdminDashboard.tsx` and custom tenant dashboard logic.
- `/src/lib/redis.js`
  - **Reason:** JS format mismatch in TS tree. Logic successfully migrated into `src/server/infra/redis/client.ts`.
- `/src/components/AuthCallback.tsx`
  - **Reason:** Unused React hook implementation for callback routing.
- `/src/server/core/db/login.usecase.ts`
  - **Reason:** Empty shell file (0 bytes).
- `/src/server/core/config/app.config.ts`
  - **Reason:** Legacy config object pattern. Superseded by Zod EVN abstractions.
- `/src/server/core/middleware/validation.middleware.ts`
  - **Reason:** Deprecated in `v4.33.23`. App logic shifted fully to manual Zod evaluation at the HTTP Controller limits.
- `/src/shared/components/BottomNav.tsx`, `/src/shared/hooks/useFeatureFlag.ts`, `/src/server/shared/utils/serialize-bigint.ts`
  - **Reason:** Unused auxiliary code no longer requested by any component.
- `/src/apps/security/hooks/useTenantSocket.ts`
  - **Reason:** Superseded by `useSocketEvents.ts` and condition-based Zustand triggers.
- `/src/apps/security/interfaces/ShiftTab.tsx`
  - **Reason:** Outdated/duplicate version of `AttendanceTab.tsx`.
- `/src/apps/tenants/interfaces/components/AddressAutocomplete.tsx`
  - **Reason:** Contains outdated bindings (`@vis.gl/react-google-maps`) strictly disallowed by `AGENTS.md` (Google Maps constraint).

### 🟡 Medium Risk
These files touch integrations that might not be running but possess foundational syntax:
- `/src/server/core/media/providers/cloudinary.provider.ts`
  - **Reason:** Configured provider but completely orphan and uninstantiated in runtime logic. Could be repurposed if media constraints change. 

### 🔴 High Risk (Preserved)
The analysis flagged files which *cannot* be cleaned. These have been actively excluded from archiving:
- `run-migration.mjs`, `prisma/apply_rls.ts`
  - **Reason:** Fundamental to Docker migration execution pipeline (`docker-compose.yml` lifecycle hooks).
- `scripts/pdf-server.js`
  - **Reason:** Acts as the dedicated Microservice executable via `Dockerfile.pdf` (`port: 3001`).

## 3. Post-Cleanup Verification Status
- **Moved to `/_archive_cleanup_candidate/`:** Yes.
- **Build Pass:** Yes, full stack compiled correctly without TypeScript errors.
- **Runtime Integity:** Preserved. No module resolution crashes were detected.
