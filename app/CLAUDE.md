# CLAUDE.md — Supplier Directory

## Project Overview

Full-stack supplier directory application built with Next.js 16 (App Router), PostgreSQL via Prisma ORM, and Tailwind CSS 4. Allows searching, filtering, and managing manufacturing suppliers with role-based access control. Features a magazine-style landing page, admin-curated featured suppliers, ad management, and site settings.

## Quick Reference

### Commands
- `npm run dev` — Start development server (port 3000)
- `npm run build` — Production build (run after changes to verify)
- `npm run lint` — ESLint
- `npx prisma migrate dev --name <name>` — Create and apply a migration
- `npx prisma studio` — Database GUI
- `npx tsx scripts/migrate-csv.ts` — Import suppliers from `suppliers.csv`
- `npx tsx scripts/create-admin.ts` — Create/reset admin user

### Environment
- `.env` contains `DATABASE_URL` (PostgreSQL) and `JWT_SECRET`
- Working directory for all commands: `/Users/blebo/repos/supplier-directory/app/`
- CSV source file is one level up: `../suppliers.csv`

### Docker (local development)
- `docker compose up --build -d` — Build and start all services
- App on port 3075, Prisma Studio on port 5555, PostgreSQL on port 5433
- `docker compose down` — Stop all services

### VM Deployment
- `sudo bash deploy.sh` — Single-command provisioning on a clean Ubuntu VM
- Installs Node.js 20, PostgreSQL 16, Nginx, PM2, and configures everything
- See deploy script for redeploy instructions printed at the end

## Architecture

### Stack
- **Framework:** Next.js 16.1.6, React 19, TypeScript 5
- **Database:** PostgreSQL with Prisma 5.22
- **Auth:** JWT (jose) with bcrypt, httpOnly refresh cookies
- **Validation:** Zod
- **Styling:** Tailwind CSS 4
- **CSV:** csv-parse
- **Containerization:** Docker with multi-stage builds, docker-compose

### Directory Structure
```
app/
  src/
    app/                  # Next.js App Router pages & API routes
      page.tsx            # Home — magazine-style landing page
      search/page.tsx     # Directory — search, filter, paginate suppliers
      admin/              # Admin pages (users, ads, featured, archived, analytics, csv-upload, settings)
      api/
        auth/             # login, register, me, refresh
        suppliers/        # CRUD, media, links, contact, analytics tracking
        suppliers/popular # Popular suppliers by view count
        settings/         # Public site settings (hero image, logo)
        admin/            # users, analytics, csv-upload, ads, settings
        ads/              # Ad serving and tracking
    components/
      auth/               # AuthModal, AuthProvider (context)
      suppliers/          # SupplierCard, FeaturedSupplierCard, Grid, Modal, EditForm, Search, Pagination, CategorySidebar
      contact/            # ContactForm
      media/              # ImageGallery, ImageUploader, Lightbox, VideoPlayer, VideoManager, DocumentList, DocumentUploader, LinkList, LinkManager
      ads/                # LeaderboardAd, SidebarAd, GridAd, useAds hook
    lib/
      auth.ts             # JWT sign/verify, password hashing, getUserFromRequest, requireRole
      prisma.ts           # Singleton Prisma client
      storage.ts          # File storage to public/uploads/ (supplier media, ads, site assets)
      csv-parser.ts       # Shared CSV parsing logic (used by migrate script and upload API)
      types.ts            # Shared TypeScript interfaces
  prisma/
    schema.prisma         # Database schema
    migrations/           # Migration history
  scripts/
    migrate-csv.ts        # Bulk CSV import script
    create-admin.ts       # Admin user creation
  public/
    sd-hero.jpg           # Default hero background image
docker-compose.yml        # Local dev: app + db + prisma studio
studio-proxy/             # Prisma Studio proxy for Docker
deploy.sh                 # VM provisioning script
```

### Database Models
- **User** — email/password auth with roles (ADMIN, EDITOR, VIEWER)
- **Supplier** — core entity with company info, address, `archived` and `featured` flags
- **Category** / **SupplierCategory** — many-to-many categories
- **SupplierImage** — up to 5 images per supplier
- **SupplierVideo** — video URLs (YouTube or direct)
- **SupplierDocument** — PDF uploads
- **SupplierLink** — external URLs with title (displayed under documents)
- **SupplierView** — analytics: tracks modal opens
- **WebLinkClick** — analytics: tracks website link clicks
- **ContactMessage** — visitor messages to suppliers
- **Ad** / **AdImpression** / **AdClick** — ad serving with placement types (GRID, SIDEBAR, LEADERBOARD)
- **SiteSetting** — key-value store for admin-configurable settings (heroImage, siteLogo)

### Auth & Roles
- **ADMIN** — full access: user management, CSV upload, analytics, editing, ads, featured, settings
- **EDITOR** — can edit suppliers and manage media/links
- **VIEWER** — read-only (default for new registrations)
- First registered user automatically gets ADMIN role
- Access token: 1hr, refresh token: 7 days (httpOnly cookie)

### Key Patterns
- API routes use `getUserFromRequest()` + `requireRole()` for auth
- Prisma client is a singleton via `src/lib/prisma.ts`
- All API validation uses Zod schemas
- Supplier IDs are integers from the CSV (not auto-incremented)
- The `archived` field hides suppliers from public view; admin can see all with `?includeArchived=true`
- The `featured` field marks suppliers for the home page featured section; admin manages via `/admin/featured`
- CSV upload upserts suppliers and archives any not present in the new file
- Media files stored in `public/uploads/{images,videos,documents}/{supplierId}/`
- Ad images stored in `public/uploads/ads/{adId}/`
- Site assets stored in `public/uploads/site/`
- Home page (`/`) is a magazine-style landing; full directory is at `/search`
- Home page hero image and site logo are admin-configurable via SiteSetting

### Page Structure
- `/` — Magazine-style home: hero with search, leaderboard ads, featured companies, category browsing (12 + "Show All"), popular suppliers, directory CTA
- `/search` — Full directory with search, category sidebar, supplier grid with ad interleaving, pagination. Supports `?q=` and `?category=` URL params
- `/admin` — User management
- `/admin/ads` — Ad management (CRUD, image upload, analytics)
- `/admin/featured` — Featured supplier management (search + toggle)
- `/admin/archived` — Archived supplier management
- `/admin/analytics` — View/click analytics
- `/admin/csv-upload` — Bulk supplier import
- `/admin/settings` — Site settings (hero image, site logo)

### API Routes Summary
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/register` | Public | Register |
| GET | `/api/auth/me` | Bearer | Current user |
| POST | `/api/auth/refresh` | Cookie | Refresh token |
| GET | `/api/suppliers` | Public | Search/paginate suppliers (supports `?featured=true`) |
| GET | `/api/suppliers/[id]` | Public | Supplier detail with media and links |
| PUT | `/api/suppliers/[id]` | Editor+ | Update supplier (incl. categories, featured, archived) |
| GET | `/api/suppliers/popular` | Public | Top viewed suppliers by time window |
| POST | `/api/suppliers/[id]/contact` | Public | Send contact message |
| POST | `/api/suppliers/[id]/view` | Public | Track supplier view |
| POST | `/api/suppliers/[id]/click` | Public | Track website link click |
| POST/DELETE | `/api/suppliers/[id]/images` | Editor+ | Manage images |
| POST/DELETE | `/api/suppliers/[id]/videos` | Editor+ | Manage videos |
| POST/DELETE/GET | `/api/suppliers/[id]/documents` | Editor+ | Manage documents |
| POST/DELETE | `/api/suppliers/[id]/links` | Editor+ | Manage external links |
| GET | `/api/settings` | Public | Get site settings |
| PUT | `/api/admin/settings` | Admin | Update site settings (file upload or value) |
| GET | `/api/ads` | Public | Get active ads by placement |
| POST/PUT/DELETE | `/api/admin/ads` | Admin | Manage ads |
| POST | `/api/ads/[adId]/impression` | Public | Track ad impression |
| POST | `/api/ads/[adId]/click` | Public | Track ad click |
| GET/POST | `/api/admin/users` | Admin | List/create users |
| PUT | `/api/admin/users/[userId]` | Admin | Update user role |
| GET | `/api/admin/analytics` | Admin | View analytics |
| POST | `/api/admin/csv-upload` | Admin | Upload CSV to upsert suppliers |
