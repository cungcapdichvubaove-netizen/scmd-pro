# Internal Technical Notes (SCMD Pro v2.5)

## Critical Fixes Log
1. **Auth Service**: Standardized `generateAuthPayload` as the single source of truth for both Login and Refresh flows. 
2. **Redis Infra**: Moved to dedicated client for BullMQ (`getBullRedis`) to prevent dynamic property access errors on Proxy wrappers.
3. **Docker DNS**: Service names in `docker-compose.yml` (e.g., `redis`) are used instead of `container_name` to ensure reliable internal networking.

## Env Var Checklist
| Key | Purpose | Required in Prod |
| :--- | :--- | :--- |
| `JWT_SECRET` | Signing Access Tokens | YES (Server crashes if missing) |
| `RECAPTCHA_SECRET_KEY` | Bot protection | YES (Fail-open implemented) |
| `DATABASE_URL` | Prisma connection | YES |

*Strict adherence to .cursorrules is required for all new feature branches.*