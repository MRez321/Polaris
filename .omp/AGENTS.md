# Tailor Inventory Management System - Agent Context

## Project Overview
A full-stack web application for managing a tailoring/clothing distribution business. The system tracks inventory items, sidewalk sellers, consignments (handovers), and payments. Designed for mobile-first usage with PWA capabilities.
the project language is persian

## Business Context
- **Business Type**: Tailoring and clothing item sales with distribution to sidewalk street sellers
- **Core Problem**: Managing inventory handovers to multiple sellers, tracking debts, and handling payments has become unmanageable at scale
- **Solution**: Digital tracking system accessible via phone on the go
- **Key Workflow**:
    1. Admin gives inventory items to sidewalk sellers (consignment)
    2. Sellers sell items and return cash periodically
    3. System tracks debts, payments, and inventory in real-time

## Technical Stack

### Frontend
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui (based on Radix UI) mostly persian version with rtl https://ui.persian-labs.ir/llms.txt
- **Icons**: Lucide React
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod validation
- **Date Handling**: date-fns
- **Notifications**: Sonner (toast notifications)
- **PWA**: Vite Plugin PWA (for mobile installability)
- **Deployment**: Built to static files → uploaded to cPanel `public_html/`

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js + TypeScript
- **Database**: MySQL (cPanel's native MySQL) + drizzle
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Deployment**: Separate subdomain (e.g., `api.domain.com`) on cPanel's Node.js selector

## Architecture Decisions

### Deployment Strategy (Path 2 - Separate Subdomain)
- **Frontend**: `https://polarisstyle.ir` → Apache serves static files from `public_html/`
- **Backend**: `https://api.polarisstyle.ir` → Node.js app running on cPanel
- **Why**:
    - Frontend updates are instant (no Node restart needed)
    - Backend restarts only when API changes
    - Better security through CORS isolation
    - Marketing team can update website without touching inventory logic

