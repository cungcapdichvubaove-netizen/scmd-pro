# SCMD Pro - Modular Backend Architecture

## Overview
This backend has been refactored from a monolithic structure into a production-grade, modular architecture based on Clean Architecture principles.

## Layers
1. **API Gateway (Express)**: Entry point for all HTTP requests, handling routing, security, and rate limiting.
2. **Core Services**: Centralized logic for Database (Firestore), Cache (Redis), Queue (BullMQ), and Logging (Pino).
3. **Infrastructure Layer**: Low-level integrations for Redis, Socket.IO, and Puppeteer.
4. **Modules**: Domain-specific logic separated into Controller, Service, and Repository.
5. **Shared Layer**: Common utilities, constants, and middlewares.

## Key Features
- **Scalability**: Horizontal scaling ready with Redis Pub/Sub for Socket.IO and BullMQ for background jobs.
- **Security**: 
  - RBAC (Role-Based Access Control)
  - Rate limiting per IP
  - Secure JWT with refresh token rotation
  - Input validation via Zod
- **Performance**: 
  - Multi-layer caching (Redis + In-memory fallback)
  - Offloaded heavy tasks (PDF generation) to background workers
- **Maintainability**: Clear separation of concerns and strict TypeScript usage.

## Directory Structure
- `core/`: Database, Cache, Queue, Logger
- `infra/`: Redis, Socket, Puppeteer
- `modules/`: Auth, Tenant, Patrol, SuperAdmin, Report
- `shared/`: Middlewares, Utils, Constants
- `app.ts`: Express application setup
- `index.ts`: Server entry point
- `routes.ts`: Centralized routing
