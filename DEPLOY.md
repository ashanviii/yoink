# Deploying yoink for free (Oracle Cloud Always Free)

This gets yoink live on a free Oracle Cloud ARM server with automatic HTTPS. Budget about 30–45 minutes the first time.

Oracle's free tier: up to 4 ARM CPUs, 24 GB RAM and 10 TB/month outbound traffic. Free-tier terms change, so check the current details when you sign up.

**You need:** a credit/debit card for Oracle's identity check (Always Free resources aren't charged) and a GitHub account (for DuckDNS login).

---

## 1. Create the Oracle Cloud account

1. Sign up at <https://www.oracle.com/cloud/free/>.
2. **Pick your home region carefully. It can't be changed later.**
   - If you're in India, choose a region **outside India** (e.g. Singapore, Frankfurt, Amsterdam). TikTok is blocked from Indian IPs, including servers there.
   - If you later get "Out of capacity" errors, it's this region that's out of free ARM servers.

## 2. Create the server

In the Oracle console: **Compute → Instances → Create instance**.

1. **Name:** `yoink`
2. **Image:** click *Change image* → **Canonical Ubuntu 24.04** (pick the *aarch64* build if asked).
3. **Shape:** click *Change shape* → **Ampere** → `VM.Standard.A1.Flex` → **4 OCPUs, 24 GB memory**. It should say "Always Free-eligible".
4. **Networking:** keep the defaults (new VCN, public subnet) and make sure **Assign a public IPv4 address** is on.
5. **SSH keys:** choose *Generate a key pair for me* and **download the private key**. You can't get it again.
6. **Boot volume:** the default (~47 GB) is fine. Free tier allows up to 200 GB total.
7. Click **Create**.

> **"Out of capacity for shape VM.Standard.A1.Flex"?** Free ARM servers are popular. Try a different *availability domain* in the same form, try fewer OCPUs (2 OCPU / 12 GB works fine), or retry in a few hours.

When it's *Running*, copy its **Public IP address**.

## 3. Open ports 80 and 443

Oracle blocks web traffic in **two** places, and you must open both.

**a) Cloud firewall:** on the instance page, click the **subnet** link → **Security Lists** → the default list → **Add Ingress Rules**:

| Source CIDR | IP Protocol | Destination port |
| --- | --- | --- |
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |
| `0.0.0.0/0` | UDP | `443` |

**b) The server's own firewall** is done in step 5 below.

## 4. Get a free domain (DuckDNS)

1. Go to <https://www.duckdns.org>, sign in with GitHub.
2. Add a subdomain, e.g. `yoink-yourname` → you get `yoink-yourname.duckdns.org`.
3. Paste your server's **public IP** into the *current ip* box → **update ip**.

> Have your own domain? Instead, create an **A record** pointing to the server's IP and use that domain everywhere below.

## 5. Set up the server

Connect with the key you downloaded (on Windows, run this in PowerShell or Git Bash):

```bash
ssh -i path/to/ssh-key.key ubuntu@YOUR_SERVER_IP
```

> If ssh complains the key is "too open" on Mac/Linux, run `chmod 600 path/to/ssh-key.key` first.

Then run these on the server:

```bash
# Open ports in Ubuntu's firewall (Oracle images block them by default)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```

Reconnect with the same `ssh` command (so the Docker permission takes effect), then:

```bash
git clone https://github.com/ashanviii/yoink.git
cd yoink
cp .env.example .env
openssl rand -base64 48     # copy the output, it's your YOINK_SECRET
nano .env
```

In `nano`, set these (use your own domain), then save with **Ctrl+O, Enter, Ctrl+X**:

```env
DOMAIN=yoink-yourname.duckdns.org
YOINK_SECRET=<paste the openssl output>
NEXT_PUBLIC_SITE_URL=https://yoink-yourname.duckdns.org
NEXT_PUBLIC_CONTACT_EMAIL=you@example.com

# Tuned for 4 OCPU / 24 GB. Halve these on 2 OCPU / 12 GB.
YOINK_MAX_CONCURRENT_RESOLVES=12
YOINK_MAX_QUEUED_RESOLVES=200
YOINK_MAX_CONCURRENT_JOBS=6
YOINK_MAX_QUEUED_JOBS=50
```

Leave `YOINK_CLIENT_IP_HEADER` / `YOINK_TRUSTED_PROXY_HOPS` alone. `docker-compose.yml` already sets them correctly for Caddy.

## 6. Launch

```bash
docker compose up -d --build
```

The first build takes ~5–10 minutes on ARM. Then check it:

```bash
docker compose ps                       # both services "running"/"healthy"
docker compose logs -f caddy            # watch for "certificate obtained successfully", Ctrl+C to exit
curl https://YOUR_DOMAIN/api/health     # {"ok":true,...}
```

Open `https://YOUR_DOMAIN` on your phone and download something. 🎉

## 7. Before you post it

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

- **Site doesn't load / certificate errors in `docker compose logs caddy`:** DNS must point to the server (check DuckDNS shows the right IP), and ports 80/443 must be open in **both** the Oracle security list and iptables (steps 3 and 5).
- **`set YOINK_SECRET in .env` error on startup:** `.env` is missing a required value.
- **YouTube says "temporarily blocking our requests":** YouTube is challenging the server's datacenter IP. Instagram/Pinterest/TikTok keep working. Fixes: wait it out, or set `YTDLP_PROXY` to a residential proxy.
- **Lots of "We're at capacity":** raise `YOINK_MAX_CONCURRENT_RESOLVES` / `YOINK_MAX_CONCURRENT_JOBS`, then `docker compose up -d`. Watch memory with `free -h`.
- **Oracle reclaimed the server:** Oracle may reclaim Always Free instances that sit nearly idle for a week. Real traffic prevents this. Upgrading the account to Pay-As-You-Go (still free within Always Free limits) also exempts it.
