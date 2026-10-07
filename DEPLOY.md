# Deploying Yoinkit

This gets Yoinkit live on any Linux server with automatic HTTPS, using Docker Compose and Caddy. Budget about 20–30 minutes the first time.

**You need:**
- A Linux server (VPS) with a public IP, Ubuntu 22.04 or newer recommended, and SSH access. x86_64 and ARM64 both work.
- A domain name you control.

Yoinkit's server only resolves links and relays some media (videos are processed in each visitor's browser), so a small server is enough: 1–2 vCPUs and 2 GB RAM is a fine start.

> **Region matters.** Some platforms block certain countries. If you're in India, pick a server **outside India**, because TikTok is blocked from Indian IPs, including servers there.

---

## 1. Point your domain at the server

Create an **A record** for your domain (or a subdomain such as `yoink.example.com`) pointing to the server's public IP. DNS can take a few minutes to update.

## 2. Open ports 80 and 443

Caddy needs these to get a certificate and serve the site. Allow them in your provider's firewall / security group **and**, if you use one, the server's own firewall:

| Protocol | Port |
| --- | --- |
| TCP | 80 |
| TCP | 443 |
| UDP | 443 |

With `ufw`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

## 3. Install Docker

Connect to the server:

```bash
ssh -i path/to/ssh-key.key USER@YOUR_SERVER_IP
```

> If ssh complains the key is "too open" on Mac/Linux, run `chmod 600 path/to/ssh-key.key` first.

Then install Docker and give your user access to it:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```

Reconnect with the same `ssh` command (so the Docker permission takes effect).

## 4. Get the code and configure it

```bash
git clone https://github.com/ashanviii/yoink.git
cd yoink
cp .env.example .env
openssl rand -base64 48     # copy the output, it's your YOINK_SECRET
nano .env
```

In `nano`, set these (use your own domain), then save with **Ctrl+O, Enter, Ctrl+X**:

```env
DOMAIN=yoink.example.com
YOINK_SECRET=<paste the openssl output>
NEXT_PUBLIC_SITE_URL=https://yoink.example.com

# Scale these with your server's size. Halve them on 1–2 vCPUs / 2 GB.
YOINK_MAX_CONCURRENT_RESOLVES=6
YOINK_MAX_QUEUED_RESOLVES=100
```

Leave `YOINK_CLIENT_IP_HEADER` / `YOINK_TRUSTED_PROXY_HOPS` alone. `docker-compose.yml` already sets them correctly for Caddy.

## 5. Launch

```bash
docker compose up -d --build
```

The first build takes a few minutes. Then check it:

```bash
docker compose ps                       # both services "running"/"healthy"
docker compose logs -f caddy            # watch for "certificate obtained successfully", Ctrl+C to exit
curl https://YOUR_DOMAIN/api/health     # {"ok":true,...}
```

Open `https://YOUR_DOMAIN` on your phone and download something. 🎉

## 6. Before you post it

From your **laptop** (not the server), run a short load test against the live site:

```bash
npm run loadtest -- --base https://YOUR_DOMAIN --users 50 --duration 60
```

Watch the error breakdown. Lots of `BUSY` means raise the concurrency settings (RAM permitting). `UPSTREAM_BLOCKED` means a platform is rate-limiting the server's IP (see troubleshooting).

---

## Day-to-day

| Task | Command (in `~/yoink` on the server) |
| --- | --- |
| Deploy new code | `git pull && docker compose up -d --build` |
| Watch logs | `docker compose logs -f yoink` |
| Live load | `curl -s https://YOUR_DOMAIN/api/health` |
| Restart (also updates yt-dlp) | `docker compose restart yoink` |
| Stop everything | `docker compose down` |

**Keep yt-dlp fresh.** It updates itself every time the container starts. Platforms break it regularly, so restart daily with a cron job:

```bash
(crontab -l 2>/dev/null; echo "0 5 * * * cd ~/yoink && docker compose restart yoink") | crontab -
```

## Troubleshooting

- **Site doesn't load / certificate errors in `docker compose logs caddy`:** DNS must point to the server, and ports 80/443 must be open in **both** your provider's firewall and the server's own (step 2).
- **`set YOINK_SECRET in .env` error on startup:** `.env` is missing a required value.
- **YouTube says "temporarily blocking our requests":** YouTube is challenging the server's datacenter IP. Instagram/Pinterest/TikTok keep working. Fixes: wait it out, or set `YTDLP_PROXY` to a residential proxy.
- **Lots of "We're at capacity":** raise `YOINK_MAX_CONCURRENT_RESOLVES`, then `docker compose up -d`. Watch memory with `free -h`.
