# SCMD Pro - Dependency Impact Report
***

## 1. Unused Dependencies Analysis
Based on `knip` static analysis and cross-verification with project integrations.

### 🟡 Identified False Positives (DO NOT ARCHIVE/DELETE)
These dependencies are marked as "Unused" by static tooling because their references are dynamic or hidden within non-TS build contexts:
- **`puppeteer` & `jspdf` & `jspdf-autotable`**
  - **Reason:** Employed primarily inside the microservice scope `scripts/pdf-server.js`. Static analysis over standard Vite pathways fails to bind their contextual relevance. Required for system operational constraints (`pdf-service`).
- **`concurrently`**
  - **Reason:** Frequently used as an operational script runner. Safe to retain for future multi-terminal execution.
- **`tailwindcss`**
  - **Reason:** Listed as unlisted/unused due to CSS integration (`index.css` via PostCSS plugins). Strictly required for UI design templates.

### 🟢 Identified Confirmed Unused (Safe to Uninstall)
These dependencies lack any trace strings throughout the entirety of source files outside test archives or inactive configuration:
- **`@opentelemetry/auto-instrumentations-node`**
  - **Reason:** Excluded based on specific SDK configurations. 
- **`react-helmet-async`**
  - **Reason:** SPA head management unused within the React router context structure.
- **`idb-keyval`**
  - **Reason:** Abandoned persistent storage library. Cache management happens primarily over React Query and Zustand.
- **`cloudinary`**
  - **Reason:** `src/server/core/media/providers/cloudinary.provider.ts` has been successfully moved to staging archive.

## 2. Action Items
- Proceed to selectively trigger `npm uninstall` on `react-helmet-async`, `idb-keyval`, and `@opentelemetry/auto-instrumentations-node` when requested by deployment maintainers.
- All high-stake dependencies (Puppeteer / SCMD integrations) successfully survived rigorous exclusion passes. No impact to microservice deployment expected.
