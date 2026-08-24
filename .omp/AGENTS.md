
# Tailor Inventory Management System
## AI Agent Development Guide

---

## 🤖 Agent Identity & Context

**You are an AI coding assistant helping build a full-stack web application for a tailoring business named Polaris Style.**


**Target Users:** Business owners mobile first app
**content and app language** Persian
**Deployment:** cPanel shared hosting (Node.js + MySQL)
**Current Phase:** Initial development

---

### DevOps
- GitHub Actions (CI/CD)
- FTP for deployment
- cPanel Node.js Selector
- MySQL (cPanel)

---

## 📁 Project Structure
read [STRUCTURE.md](../STRUCTURE.md)


## Technical Stack

### Frontend
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui (based on Radix UI) mostly persian version with rtl from https://ui.persian-labs.ir/llms.txt
- **Icons**: Lucide React
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod validation
- **Date Handling**: date-fns
- **realtime data**: socket-io-client
- **Notifications**: Sonner (toast notifications)
- **PWA**: Vite Plugin PWA (for mobile installability)
- **Deployment**: Built to static files → uploaded into the backend's `public/` folder; served by Express on the same origin

make sure to use ui elements from persian labs in this address
https://ui.persian-labs.ir/llms.txt
https://ui.persian-labs.ir/docs/components

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js + TypeScript
- **Database**: MySQL (cPanel's native MySQL) mysql2 + drizzle
- **Authentication**: better auth + zod validation
- **Password Hashing**: bcrypt
- **Deployment**: cPanel Node.js selector at `/PolarisStyle/`; Express serves the API under `/api` and the built frontend from `public/` (single domain, no API subdomain)
- **realtime data**: socket-io

## Architecture Decisions

## 📁 Deployment Structure
read the action that deploys the app [deploy.yml](../.github/workflows/deploy.yml)

### Deployment Strategy (Single Domain — Backend Serves Frontend)
- **Domain**: `https://polarisstyle.ir` only — no API subdomain
- **Backend**: Node.js app root `/PolarisStyle/` (cPanel Node.js selector); serves `/api` routes and the built frontend from `/PolarisStyle/public/` with an SPA fallback to `index.html`
- **Frontend**: Vite build uploaded into the backend's `public/` folder (CI: backend first, then frontend, then restart trigger)
- **Restart trigger**: CI uploads a file to `/PolarisStyle/tmp/` so cPanel restarts the Node app
- **Health check**: `/api/health` verifies the MySQL database connection (data can be saved), not just the Node process
- **Why**:
    - Same origin: no CORS/subdomain setup, simpler sessions and cookies
    - One deploy target; frontend and API versions cannot drift apart


