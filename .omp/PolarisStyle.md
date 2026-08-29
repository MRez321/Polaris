---
description: Core constraints for Polaris Style tailoring inventory system. Always active.
---

# Polaris Style - Agent Constraints

## Language & Locale
- ALL user-facing content MUST be in Persian (Farsi)
- RTL layout enforced globally
- Use Persian Labs UI components exclusively: https://ui.persian-labs.ir/llms.txt
- Date formatting: date-fns with fa-IR locale
- Numbers: Persian numerals in display, ASCII in API/database

## Tech Stack Enforcement
- Frontend: React 18 + Vite + TypeScript + Tailwind + Axios + Shadcn/ui (Persian Labs RTL fork)
- Backend: Express.js + TypeScript + mysql2 + Drizzle ORM
- Auth: better-auth + bcrypt + Zod validation
- Forms: React Hook Form + Zod ONLY (no custom validation logic)
- Realtime: socket.io-client / socket.io (no alternatives)
- Notifications: Sonner only (no react-toastify, no custom alerts)

## Deployment Constraints
- Single domain: polarisstyle.ir (NO api subdomain, NO CORS)
- Backend serves frontend from `/public/` with SPA fallback
- cPanel Node.js selector at `/PolarisStyle/`
- Health check MUST verify MySQL connectivity, not just process alive
- CI deploys backend → frontend → restart trigger via `/tmp/` upload

## Forbidden Patterns
- NEVER use English in UI strings, error messages, or validation feedback
- NEVER create API subdomains or CORS configurations
- NEVER use moment.js, dayjs, or native Date for display formatting
- NEVER bypass Zod validation at API boundaries
- NEVER store passwords without bcrypt hashing
- NEVER use non-Persian-Labs UI components when equivalent exists