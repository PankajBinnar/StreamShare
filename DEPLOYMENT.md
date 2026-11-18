# StreamShare Production CI/CD & Deployment Guide

This guide details the complete, step-by-step process to deploy StreamShare to production using modern Continuous Integration & Continuous Deployment (CI/CD).

---

## Architecture of the CI/CD Pipeline

```
 [Developer Push to 'main']
             │
             ▼
 ┌────────────────────────────────────────┐
 │   GitHub Actions CI (Automated Tests)  │
 │   - TypeScript Typecheck               │
 │   - ESLint & Security Check            │
 │   - Prisma Schema Validation           │
 └────────────────────────────────────────┘
             │ (Success)
             ▼
 ┌────────────────────────────────────────┐
 │   GitHub Actions CD (Auto-Migration)   │
 │   - Applies Prisma schema to Live DB   │
 └────────────────────────────────────────┘
             │
             ├────────────────────────────────────┐
             ▼                                    ▼
 ┌──────────────────────┐             ┌──────────────────────┐
 │   Frontend (Vercel)  │             │  Backend (Railway)   │
 │   Next.js 14 Client  │             │  Express + Socket.io │
 │   Edge CDN & Static  │             │  PostgreSQL & Redis  │
 └──────────────────────┘             └──────────────────────┘
```

---

## Strategy A: Modern Cloud GitOps (Recommended & Easiest)

This approach requires zero server maintenance, scales automatically, and deploys every time you push to your GitHub `main` branch.

### Step 1: Push Project to GitHub
1. Create a new GitHub repository named `streamshare`.
2. In your local terminal:
   ```bash
   git init
   git add .
   git commit -m "feat: complete production StreamShare P2P marketplace"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/streamshare.git
   git push -u origin main
   ```

---

### Step 2: Provision Production Database & Redis (5 Minutes)
1. Go to **[Railway.app](https://railway.app)** or **[Render.com](https://render.com)**.
2. Click **New Project** -> **Database** -> **Add PostgreSQL**.
   * Copy the generated `DATABASE_URL` (e.g., `postgresql://postgres:password@junction.railway.app:port/railway?sslmode=require`).
3. Click **Add Service** -> **Database** -> **Add Redis**.
   * Copy the generated `REDIS_URL` (e.g., `redis://default:password@junction.railway.app:port`).

---

### Step 3: Deploy Backend API & WebSockets (Railway or Render)
1. In Railway, click **New Service** -> **GitHub Repo** -> select `streamshare`.
2. Set the **Root Directory** to `/server`.
3. Under **Variables**, add:
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=<Your Production PostgreSQL URL>
   REDIS_URL=<Your Production Redis URL>
   ENABLE_CACHE=true
   CLIENT_ORIGIN=https://<your-frontend-vercel-domain>.vercel.app
   JWT_ACCESS_SECRET=<Generate a 64-character random string>
   JWT_REFRESH_SECRET=<Generate a 64-character random string>
   ADMIN_ALLOWED_IPS=*
   ```
4. Click **Deploy**. Railway will run the Docker build, run health checks, and provide your public API domain (e.g., `https://streamshare-api-production.up.railway.app`).

---

### Step 4: Deploy Frontend Client (Vercel)
1. Go to **[Vercel.com](https://vercel.com)** and log in with GitHub.
2. Click **Add New** -> **Project** -> import `streamshare`.
3. Set **Root Directory** to `client`.
4. Under **Environment Variables**, add:
   ```env
   NEXT_PUBLIC_API_URL=https://streamshare-api-production.up.railway.app/api
   NEXT_PUBLIC_SOCKET_URL=https://streamshare-api-production.up.railway.app
   ```
5. Click **Deploy**. Vercel will build the Next.js app and assign your live production URL (e.g., `https://streamshare.vercel.app`).
6. *Important*: Go back to Railway and update `CLIENT_ORIGIN` with your actual Vercel domain!

---

### Step 5: Configure GitHub Secrets for Automated Migrations
In your GitHub repository:
1. Navigate to **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret**:
   * Name: `PRODUCTION_DATABASE_URL`
   * Value: Your live PostgreSQL connection string.
3. Every push to `main` will now automatically:
   - Run linter & type checks (`.github/workflows/ci.yml`).
   - Run database schema migrations (`.github/workflows/deploy.yml`).
   - Trigger zero-downtime rebuilds on Vercel and Railway!

---

## Strategy B: Single Server / VPS Deployment (Docker Compose + Nginx)

If you prefer hosting everything on a single Ubuntu Virtual Private Server (AWS EC2, DigitalOcean Droplet, or Hetzner):

1. **SSH into your VPS**:
   ```bash
   ssh root@your-server-ip
   ```
2. **Install Docker & Docker Compose**:
   ```bash
   apt-get update && apt-get install -y docker.io docker-compose git
   ```
3. **Clone and Configure**:
   ```bash
   git clone https://github.com/<YOUR_USERNAME>/streamshare.git
   cd streamshare
   ```
4. **Create Production `.env` file**:
   ```env
   POSTGRES_USER=streamshare_prod
   POSTGRES_PASSWORD=generate_super_strong_password_here
   POSTGRES_DB=streamshare_prod_db
   JWT_ACCESS_SECRET=generate_strong_64_char_secret_1
   JWT_REFRESH_SECRET=generate_strong_64_char_secret_2
   CLIENT_ORIGIN=https://yourdomain.com
   ADMIN_ALLOWED_IPS=*
   ```
5. **Launch Production Stack**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```
6. **Set Up Free SSL with Let's Encrypt**:
   ```bash
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```

