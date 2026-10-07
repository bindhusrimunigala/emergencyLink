# EmergencyLink — Deployment Guide

This guide covers three deployment options:
1. **Local Docker** — run the full stack on your machine with one command
2. **VPS / Cloud Server** — deploy to a Linux server (AWS EC2, DigitalOcean, Azure VM)
3. **Twilio SMS Setup** — enable real SMS notifications

---

## Option 1 — Local Docker (Quickest)

### Prerequisites
- Install Docker Desktop: https://www.docker.com/products/docker-desktop/
- After install, open Docker Desktop and wait for it to say "Running"

### Steps

**1. Create the production env file**
```powershell
cd d:\projects\EmergencyLink
copy .env.production .env
```

Open `.env` and set at minimum:
```
DB_PASSWORD=any_strong_password
JWT_SECRET=any_long_random_string_at_least_32_chars
```

**2. Build and start everything**
```powershell
docker-compose up --build
```

This will:
- Pull PostgreSQL 16
- Build the backend image
- Build the frontend image (React build + Nginx)
- Start all three services with health checks

**3. Run database migrations** (first time only, in a new terminal)
```powershell
docker-compose exec backend node src/config/migrate.js
docker-compose exec backend node src/config/seed.js
```

**4. Open the app**

Go to: **http://localhost**

**5. Stop everything**
```powershell
docker-compose down
```

To also delete the database volume:
```powershell
docker-compose down -v
```

---

## Option 2 — VPS / Cloud Server (Production)

### Recommended Providers
| Provider | Cheapest Plan | Link |
|----------|--------------|------|
| DigitalOcean Droplet | $6/month (1GB RAM) | digitalocean.com |
| AWS EC2 t3.micro | Free tier eligible | aws.amazon.com |
| Azure VM B1s | Free tier eligible | azure.microsoft.com |
| Hetzner Cloud | €3.79/month | hetzner.com |

### Step 1 — Create a Linux server

Choose **Ubuntu 22.04 LTS**. Minimum specs:
- 1 vCPU, 1GB RAM (2GB recommended)
- 20GB storage

### Step 2 — Install Docker on the server

SSH into your server then run:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### Step 3 — Copy project files to server

Option A — using Git:
```bash
# On your server
git clone https://github.com/yourusername/emergencylink.git
cd emergencylink
```

Option B — using SCP from your Windows machine:
```powershell
scp -r d:\projects\EmergencyLink user@your-server-ip:/home/user/emergencylink
```

### Step 4 — Configure environment

On the server:
```bash
cd /home/user/emergencylink
cp .env.production .env
nano .env
```

Fill in all values:
```
APP_PORT=80
FRONTEND_URL=https://yourdomain.com
DB_PASSWORD=strong_random_password_here
JWT_SECRET=run_node_-e_require_crypto_randomBytes64_toString_hex
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### Step 5 — Build and start

```bash
docker compose up --build -d
```

The `-d` flag runs in the background.

### Step 6 — Run migrations

```bash
docker compose exec backend node src/config/migrate.js
docker compose exec backend node src/config/seed.js
```

### Step 7 — Open firewall ports

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Your app is now live at **http://your-server-ip**

### Step 8 — Point a domain (optional)

1. Buy a domain from Namecheap, GoDaddy, etc.
2. Add an **A record** pointing to your server IP
3. Update `FRONTEND_URL=https://yourdomain.com` in `.env`
4. Restart: `docker compose restart`

### Step 9 — Enable HTTPS with SSL (recommended)

Install Certbot on the server:
```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d yourdomain.com
```

Then update `nginx.conf` in the frontend to use the SSL certificates. 

---

## Option 3 — Twilio SMS Setup

### Step 1 — Create a Twilio account

Go to: **https://www.twilio.com/try-twilio**

Sign up for free. The free trial gives you $15 credit — enough for ~500 SMS messages.

### Step 2 — Get your credentials

After signing in, on the Twilio Console homepage you'll see:
- **Account SID** — starts with `AC...`
- **Auth Token** — click the eye icon to reveal

Copy both.

### Step 3 — Get a phone number

1. In Twilio Console → **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a number with SMS capability
3. Click **Buy** (free with trial credit)

### Step 4 — Add credentials to .env

Open `d:\projects\EmergencyLink\backend\.env` and update:
```
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### Step 5 — Verify a number (trial accounts only)

Twilio trial accounts can only send SMS to **verified numbers**.

1. Twilio Console → **Phone Numbers** → **Verified Caller IDs**
2. Click **Add a new Caller ID**
3. Enter the phone number you want to receive SMS
4. Verify via the code sent to that number

### Step 6 — Restart backend

```powershell
# Stop the server (Ctrl+C) then restart
cd d:\projects\EmergencyLink\backend
npm run dev
```

### Step 7 — Test it

Log in as a patient → Request an Emergency → the phone number in the form should receive an SMS within seconds.

### SMS messages sent automatically

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Emergency created + ambulance dispatched | Patient | Ambulance details + ETA |
| Emergency created | Driver | Dispatch alert with patient details |
| Emergency created | Hospital staff | Incoming patient alert |
| Status → En Route | Patient | Ambulance is on the way |
| Status → At Scene | Patient | Ambulance has arrived |
| Status → Transporting | Patient | Being transported to hospital name |
| Status → Completed | Patient | Emergency completed |

---

## Useful Commands

```powershell
# View running containers
docker-compose ps

# View backend logs
docker-compose logs -f backend

# View all logs
docker-compose logs -f

# Restart a single service
docker-compose restart backend

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up --build -d

# Open a shell inside backend container
docker-compose exec backend sh

# Check database directly
docker-compose exec db psql -U postgres -d emergencylink
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 80 already in use | Change `APP_PORT=8080` in `.env` and visit http://localhost:8080 |
| Database connection refused | Make sure `DB_PASSWORD` in `.env` matches what you set |
| SMS not sending | Check `SMS_ENABLED=true` and verify Twilio credentials |
| White screen on frontend | Run `docker-compose logs frontend` to check build errors |
| Backend crashes on start | Run `docker-compose logs backend` — usually a missing env var |
| Cannot connect after deploy | Check firewall: `sudo ufw status` — port 80 must be allowed |
