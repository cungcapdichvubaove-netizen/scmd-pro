# SCMD Pro - Duplicate Analysis Report
***

## 1. File & Component Duplicates

### A. `<ShiftTab />` vs `<AttendanceTab />`
- **Path:** `/src/apps/security/interfaces/ShiftTab.tsx` vs `/src/apps/security/interfaces/AttendanceTab.tsx`
- **Similarity Percentage:** ~85%
- **Status:** **Resolved (Archived)**. `ShiftTab.tsx` was identified as an orphaned duplicate feature masking as a separate entity but functioning identically under the hood to `AttendanceTab`. Moved to `/_archive_cleanup_candidate`.
- **Dependency impact:** None, component was excluded from the main dashboard render loop.

### B. Redis Configuration Duplicates
- **Path:** `/src/lib/redis.js` vs `/src/server/infra/redis/client.ts`
- **Similarity Percentage:** 60% (Configuration level)
- **Status:** **Resolved (Archived)**. The frontend-centric structure contained an older, identical setup for establishing connection logic. Because SCMD strictly enforces connection pooling at backend, `src/lib/redis.js` was archived to enforce TS-strict connectivity behavior in the single-source infra client.

### C. Zod Entity Duplicates (Schema Layer)
- **Export Context:** `staffSchema` vs `createStaffSchema` in `/src/server/modules/staff/staff.schema.ts`
- **Status:** Existing issue. There is an overlapping abstraction layer where multiple Zod schemas are deployed defining identical input parameters for `CreateStaffInput`.
- **Mitigation Recommendation:** Refactor the schema definitions to establish a core base entity using `z.object()`, and subsequently enforce `createStaffSchema` using `.extend()` or `.omit()`.

## 2. General Utility Duplicates
None detected across fundamental layers that threaten single-source-of-truth invariants.
