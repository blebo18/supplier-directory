#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Supplier Directory — VM Deploy Script
# Targets: Ubuntu 22.04 / 24.04 (Debian-based)
# Installs: Node.js 20, PostgreSQL 16, Nginx, PM2
# ============================================================================

APP_NAME="supplier-directory"
REPO_URL="git@github.com:blebo18/supplier-directory.git"
DEPLOY_DIR="/opt/${APP_NAME}"
APP_DIR="${DEPLOY_DIR}/app"
APP_USER="supplierapp"
APP_PORT=3000
DB_NAME="supplier_directory"
DB_USER="supplierapp"
DOMAIN=""
NODE_VERSION=20

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Pre-flight checks ──────────────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
    error "This script must be run as root (use sudo)"
fi

if ! grep -qiE "ubuntu|debian" /etc/os-release 2>/dev/null; then
    warn "This script is designed for Ubuntu/Debian. Proceed at your own risk."
fi

# ── Prompt for configuration ───────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  Supplier Directory — Deploy Configuration"
echo "═══════════════════════════════════════════"
echo ""

read -rp "Domain name (leave blank for IP-only access): " DOMAIN
read -rsp "Database password for '${DB_USER}': " DB_PASS
echo ""
read -rsp "JWT secret (min 32 chars recommended): " JWT_SECRET
echo ""
read -rp "Admin email [admin@example.com]: " ADMIN_EMAIL
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
read -rsp "Admin password: " ADMIN_PASSWORD
echo ""
read -rp "Admin name [Admin]: " ADMIN_NAME
ADMIN_NAME="${ADMIN_NAME:-Admin}"
echo ""

if [ -z "$DB_PASS" ]; then
    error "Database password cannot be empty"
fi
if [ -z "$JWT_SECRET" ]; then
    error "JWT secret cannot be empty"
fi
if [ -z "$ADMIN_PASSWORD" ]; then
    error "Admin password cannot be empty"
fi

# ============================================================================
# 1. System packages
# ============================================================================
info "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -yqq

info "Installing base dependencies..."
apt-get install -yqq \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    ufw \
    nginx

# ============================================================================
# 2. Node.js via NodeSource
# ============================================================================
if command -v node &>/dev/null && node -v | grep -q "v${NODE_VERSION}"; then
    info "Node.js $(node -v) already installed"
else
    info "Installing Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -yqq nodejs
fi

info "Node.js $(node -v) — npm $(npm -v)"

# Install PM2 globally
if ! command -v pm2 &>/dev/null; then
    info "Installing PM2..."
    npm install -g pm2
fi

# ============================================================================
# 3. PostgreSQL
# ============================================================================
if ! command -v psql &>/dev/null; then
    info "Installing PostgreSQL 16..."
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
    apt-get update -qq
    apt-get install -yqq postgresql-16
fi

info "Ensuring PostgreSQL is running..."
systemctl enable postgresql
systemctl start postgresql

# Create database user and database
info "Configuring PostgreSQL..."
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'\"" | grep -q 1 || \
    su - postgres -c "psql -c \"CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';\""

su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\"" | grep -q 1 || \
    su - postgres -c "psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\""

su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};\""

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
info "Database '${DB_NAME}' ready"

# ============================================================================
# 4. Application user
# ============================================================================
if ! id "${APP_USER}" &>/dev/null; then
    info "Creating application user '${APP_USER}'..."
    useradd --system --shell /bin/bash --home-dir "${DEPLOY_DIR}" --create-home "${APP_USER}"
fi

# ============================================================================
# 5. Clone / update repo
# ============================================================================
if [ -d "${DEPLOY_DIR}/.git" ]; then
    info "Updating existing repo..."
    cd "${DEPLOY_DIR}"
    sudo -u "${APP_USER}" git pull origin main
else
    info "Cloning repository..."
    # If SSH key isn't set up, fall back to HTTPS
    if sudo -u "${APP_USER}" git ls-remote "${REPO_URL}" &>/dev/null; then
        sudo -u "${APP_USER}" git clone "${REPO_URL}" "${DEPLOY_DIR}.tmp"
    else
        HTTPS_URL="https://github.com/blebo18/supplier-directory.git"
        warn "SSH key not available for ${APP_USER}, trying HTTPS..."
        sudo -u "${APP_USER}" git clone "${HTTPS_URL}" "${DEPLOY_DIR}.tmp"
    fi
    # Move contents into deploy dir (user home already exists)
    cp -a "${DEPLOY_DIR}.tmp/." "${DEPLOY_DIR}/"
    rm -rf "${DEPLOY_DIR}.tmp"
    chown -R "${APP_USER}:${APP_USER}" "${DEPLOY_DIR}"
fi

cd "${APP_DIR}"

# ============================================================================
# 6. Environment file
# ============================================================================
info "Writing .env file..."
cat > "${APP_DIR}/.env" <<ENVEOF
DATABASE_URL="${DATABASE_URL}"
JWT_SECRET="${JWT_SECRET}"

ADMIN_EMAIL="${ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
ADMIN_NAME="${ADMIN_NAME}"
ENVEOF

chmod 600 "${APP_DIR}/.env"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"

# ============================================================================
# 7. Install dependencies & build
# ============================================================================
info "Installing npm dependencies..."
sudo -u "${APP_USER}" npm ci --prefix "${APP_DIR}"

info "Generating Prisma client..."
sudo -u "${APP_USER}" npx --prefix "${APP_DIR}" prisma generate

info "Running database migrations..."
sudo -u "${APP_USER}" npx --prefix "${APP_DIR}" prisma migrate deploy

# Create uploads directories before build (Next.js copies public/ during build)
mkdir -p "${APP_DIR}/public/uploads/images" \
         "${APP_DIR}/public/uploads/documents" \
         "${APP_DIR}/public/uploads/ads" \
         "${APP_DIR}/public/uploads/site"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/public/uploads"

info "Building application..."
sudo -u "${APP_USER}" npm run --prefix "${APP_DIR}" build

info "Creating admin user..."
sudo -u "${APP_USER}" npx --prefix "${APP_DIR}" tsx "${APP_DIR}/scripts/create-admin.ts" || warn "Admin user creation failed (may already exist)"

# ============================================================================
# 8. PM2 process manager
# ============================================================================
info "Setting up PM2..."

cat > "${APP_DIR}/ecosystem.config.cjs" <<'PM2EOF'
module.exports = {
  apps: [{
    name: "supplier-directory",
    cwd: "./",
    script: "node_modules/.bin/next",
    args: "start --port 3000",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: "512M",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    error_file: "/var/log/supplier-directory/error.log",
    out_file: "/var/log/supplier-directory/out.log",
  }]
};
PM2EOF

chown "${APP_USER}:${APP_USER}" "${APP_DIR}/ecosystem.config.cjs"

# Create log directory
mkdir -p /var/log/supplier-directory
chown "${APP_USER}:${APP_USER}" /var/log/supplier-directory

# Stop existing if running
sudo -u "${APP_USER}" pm2 delete "${APP_NAME}" 2>/dev/null || true

# Start the app
info "Starting application with PM2..."
cd "${APP_DIR}"
sudo -u "${APP_USER}" pm2 start ecosystem.config.cjs
sudo -u "${APP_USER}" pm2 save

# Set PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u "${APP_USER}" --hp "${DEPLOY_DIR}" --service-name "${APP_NAME}"

# ============================================================================
# 9. Nginx reverse proxy
# ============================================================================
info "Configuring Nginx..."

if [ -n "$DOMAIN" ]; then
    SERVER_NAME="${DOMAIN}"
else
    SERVER_NAME="_"
fi

cat > "/etc/nginx/sites-available/${APP_NAME}" <<NGINXEOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90s;
    }

    location /_next/static/ {
        alias ${APP_DIR}/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        alias ${APP_DIR}/public/uploads/;
        expires 30d;
        access_log off;
    }
}
NGINXEOF

# Enable site, disable default
ln -sf "/etc/nginx/sites-available/${APP_NAME}" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

# ============================================================================
# 10. Firewall
# ============================================================================
info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# ============================================================================
# 11. SSL with Let's Encrypt (optional)
# ============================================================================
if [ -n "$DOMAIN" ]; then
    read -rp "Set up SSL with Let's Encrypt for ${DOMAIN}? (y/N): " SETUP_SSL
    if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
        info "Installing Certbot..."
        apt-get install -yqq certbot python3-certbot-nginx

        info "Obtaining SSL certificate..."
        certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email "${ADMIN_EMAIL}" --redirect

        info "SSL certificate installed. Auto-renewal is enabled via systemd timer."
    fi
fi

# ============================================================================
# Done
# ============================================================================
echo ""
echo "═══════════════════════════════════════════"
echo -e "  ${GREEN}Deployment complete!${NC}"
echo "═══════════════════════════════════════════"
echo ""
echo "  App directory:  ${APP_DIR}"
echo "  App user:       ${APP_USER}"
echo "  Database:       ${DB_NAME}"
echo "  Internal port:  ${APP_PORT}"
echo ""
if [ -n "$DOMAIN" ]; then
    echo "  URL:            http://${DOMAIN}"
else
    IP=$(hostname -I | awk '{print $1}')
    echo "  URL:            http://${IP}"
fi
echo ""
echo "  Admin login:    ${ADMIN_EMAIL}"
echo ""
echo "  Useful commands:"
echo "    sudo -u ${APP_USER} pm2 status        # Check app status"
echo "    sudo -u ${APP_USER} pm2 logs           # View logs"
echo "    sudo -u ${APP_USER} pm2 restart all    # Restart app"
echo "    tail -f /var/log/supplier-directory/*.log"
echo ""
echo "  To redeploy after updates:"
echo "    cd ${DEPLOY_DIR} && sudo -u ${APP_USER} git pull"
echo "    cd ${APP_DIR} && sudo -u ${APP_USER} npm ci"
echo "    sudo -u ${APP_USER} npx prisma migrate deploy"
echo "    sudo -u ${APP_USER} npm run build"
echo "    sudo -u ${APP_USER} pm2 restart all"
echo ""
