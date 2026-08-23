
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
- **realtime data**: socket-io
- **Notifications**: Sonner (toast notifications)
- **PWA**: Vite Plugin PWA (for mobile installability)
- **Deployment**: Built to static files → uploaded to cPanel `public_html/`

make sure to use ui elements from persian labs in this address
https://ui.persian-labs.ir/llms.txt
https://ui.persian-labs.ir/docs/components

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js + TypeScript
- **Database**: MySQL (cPanel's native MySQL) mysql2 + drizzle
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Deployment**: Separate subdomain (e.g., `api.domain.com`) on cPanel's Node.js selector
- **realtime data**: socket-io-client

## Architecture Decisions

### Deployment Strategy (Path 2 - Separate Subdomain)
- **Frontend**: `https://polarisstyle.ir` → Apache serves static files from `public_html/`
- **Backend**: `https://api.polarisstyle.ir` → Node.js app running on cPanel
- **Why**:
    - Frontend updates are instant (no Node restart needed)
    - Backend restarts only when API changes
    - Better security through CORS isolation
    - Marketing team can update website without touching inventory logic


