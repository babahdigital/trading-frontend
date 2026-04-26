# CI/CD + Deployment — BabahAlgo Frontend

> **Status:** Live since 2026-04-26 — production VPS3 = pull-based deploy, source code 100% offloaded ke Docker Hub.

## TL;DR

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────────────┐    ┌─────────────┐
│  Local dev   │───▶│  GitHub Actions  │───▶│     Docker Hub       │───▶│   VPS3      │
│  git push    │    │  build + push    │    │ babahdigital/        │    │ docker pull │
│              │    │  (~3 min amd64)  │    │ babahalgo-frontend   │    │ + restart   │
└──────────────┘    └──────────────────┘    └──────────────────────┘    └─────────────┘
                                                                          (~30 detik)
```

**Daily ops Anda cuma satu perintah:**
```bash
git push origin main
```
Build + publish + deploy + cleanup + smoke test = otomatis ~6 menit.

---

## Folder layout VPS3 (target state — sudah live)

```
/opt/trading-commercial/                  (2.4 MB total — bersih dari source code)
├── docker-compose.prod.yml               # config utama (dari repo, auto-sync via deploy)
├── docker-compose.db.yml                 # OPTIONAL postgres-in-docker
├── .env                                  # secrets (NEVER commit ke git)
├── .env.example                          # reference
├── .env.bak-YYYYMMDD-HHMMSS              # backup .env (auto-prune >30 hari)
├── data/
│   ├── postgres/                         # postgres data (kalau pakai docker-compose.db.yml)
│   └── backups/
│       ├── daily/                        # 7 backup terakhir (auto-prune)
│       ├── weekly/                       # 4 minggu terakhir (Sunday snapshot)
│       └── monthly/                      # 12 bulan terakhir (snapshot tgl 01)
├── public/                               # branding/CMS images (hot-swap tanpa rebuild)
└── scratch/                              # one-off test/maintenance scripts (RO mount)
```

**Source code (`src/`, `prisma/`, `node_modules/`, `dev/`, `docs/`, `Dockerfile`, dll) TIDAK ADA di VPS3.** Semua baked into image yang di-pull dari Docker Hub.

---

## Workflows

### `.github/workflows/ci.yml` — Quality Gate
Trigger: PR + push ke `main` + manual dispatch.

Jobs (path-filter aware — cuma run yang relevan):
1. **changes** — detect path changes
2. **app** — `npm ci` → `prisma generate` → `tsc --noEmit` → `next lint` → `next build`
3. **docker-smoke** — Docker build verify (no push)

Cancel-in-progress: push baru cancel build lama. Total ~5 menit.

### `.github/workflows/docker-publish.yml` — Build + Deploy
Trigger:
- Push ke `main` → tags: `latest`, `main`, `sha-<short>`
- Push tag `v1.2.3` → tags: `latest`, `v1.2.3`, `1.2`
- Manual dispatch (input: `skip_deploy`, `cleanup_cache`)

**Job 1 — build-and-push** (~3 menit):
- Login ke Docker Hub
- Build amd64 (single-arch karena VPS3 = amd64, no QEMU emulation)
- Push ke `babahdigital/babahalgo-frontend`
- GHA cache scope `babahalgo`

**Job 2 — deploy** (~1 menit, hanya saat push ke main atau workflow_dispatch):
1. Setup SSH key + ssh config alias `vps3`
2. Sync compose files via `tar | ssh` pipe (lebih reliable dari scp SFTP-based)
3. Bootstrap folder structure (`data/`, `public/`, `scratch/`) — first-time bootstrap `public/` dari image
4. Pull image + restart container + healthcheck poll 90 detik
5. **Cleanup source code (whitelist-only, non-fatal)** — hapus semua kecuali whitelist
6. Public smoke test (`/api/health`, `/api/public/capabilities`, `/pricing`)

**Whitelist saat cleanup:**
```
docker-compose.prod.yml | docker-compose.db.yml | .env | .env.example
data | public | scratch | .docker
```
Selain ini → di-hapus otomatis (try sudo -n untuk root-owned files).

### `.github/workflows/actions-housekeeping.yml` — Cron Cleanup
Cron 2x/hari: hapus workflow runs lama (keep 5 latest per workflow) + Actions cache lama (keep 3).

---

## Required GitHub Secrets

Buka https://github.com/babahdigital/trading-frontend/settings/secrets/actions:

| Secret | Value | Cara isi |
|---|---|---|
| `DOCKER_USERNAME` | `babahdigital` | `gh secret set DOCKER_USERNAME --body "babahdigital"` |
| `DOCKER_PASSWORD` | `dckr_pat_...` | Generate PAT di https://hub.docker.com/settings/security (Read+Write+Delete), lalu `gh secret set DOCKER_PASSWORD` (paste, Enter, Ctrl+Z+Enter di Windows / Ctrl+D di bash) |
| `VPS3_SSH_HOST` | `148.230.96.201` | `gh secret set VPS3_SSH_HOST --body "148.230.96.201"` |
| `VPS3_SSH_PORT` | `1983` | `gh secret set VPS3_SSH_PORT --body "1983"` |
| `VPS3_SSH_USER` | `abdullah` | `gh secret set VPS3_SSH_USER --body "abdullah"` |
| `VPS3_SSH_KEY` | full PEM | `gh secret set VPS3_SSH_KEY < ~/.ssh/id_raspi_ed25519` |
| `VPS3_DEPLOY_PATH` | `/opt/trading-commercial` | **PENTING:** kalau set dari Git Bash di Windows, prefix dengan `MSYS_NO_PATHCONV=1`, kalau tidak `/opt/...` ke-translate jadi `C:\Program Files\Git\opt\...`. Command: `MSYS_NO_PATHCONV=1 gh secret set VPS3_DEPLOY_PATH --body "/opt/trading-commercial"` |

Verify: `gh secret list` → harus muncul 7 entries.

---

## Daily ops

### Update kode (cara normal)
```bash
git push origin main
```
**Itu saja.** Lihat progress: `gh run watch` atau https://github.com/babahdigital/trading-frontend/actions.

### Manual deploy (skip CI build, hotfix dari image yang sudah ada)
```bash
ssh -i ~/.ssh/id_raspi_ed25519 -p 1983 abdullah@148.230.96.201 \
  "cd /opt/trading-commercial && \
   docker compose -f docker-compose.prod.yml pull && \
   docker compose -f docker-compose.prod.yml up -d --force-recreate"
```

### Manual deploy specific image version (rollback)
```bash
ssh -i ~/.ssh/id_raspi_ed25519 -p 1983 abdullah@148.230.96.201
cd /opt/trading-commercial
# Edit .env, tambah baris:
# IMAGE_TAG=sha-41b7332
docker compose -f docker-compose.prod.yml up -d --force-recreate
```
Tag tersedia di https://hub.docker.com/r/babahdigital/babahalgo-frontend/tags.

### Update branding / public assets (hot-swap, no rebuild)
```bash
# Logo/banner/favicon — drop file langsung ke ./public/
scp -i ~/.ssh/id_raspi_ed25519 -P 1983 my-new-logo.png \
  abdullah@148.230.96.201:/opt/trading-commercial/public/logo/
# Hard refresh di browser (Cmd+Shift+R) — file langsung ter-serve
```

### Run prisma migration di prod
```bash
ssh -i ~/.ssh/id_raspi_ed25519 -p 1983 abdullah@148.230.96.201
cd /opt/trading-commercial
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Run scratch / one-off script
```bash
# Copy script ke scratch
scp -i ~/.ssh/id_raspi_ed25519 -P 1983 my-script.ts \
  abdullah@148.230.96.201:/opt/trading-commercial/scratch/

# Execute dalam container (volume ./scratch:/app/scratch:ro)
ssh ... "cd /opt/trading-commercial && \
  docker compose -f docker-compose.prod.yml exec app npx tsx /app/scratch/my-script.ts"
```

### DB Backup operations

**Auto schedule:** setiap hari 02:00 Asia/Jakarta → `./data/backups/daily/`. Sunday → weekly. Tgl 01 → monthly. Retention 7d/4w/12m.

**Manual backup (immediate):**
```bash
ssh ... "cd /opt/trading-commercial && \
  docker compose -f docker-compose.prod.yml exec db-backup /usr/local/bin/do-backup.sh"
```

**List backups:**
```bash
ssh ... "ls -lah /opt/trading-commercial/data/backups/daily/ | tail -10"
```

**Download backup ke local:**
```bash
scp -i ~/.ssh/id_raspi_ed25519 -P 1983 \
  abdullah@148.230.96.201:/opt/trading-commercial/data/backups/daily/trading_commercial-20260426-020000.sql.gz \
  ./
```

**Restore dari backup (DESTRUCTIVE — confirm dulu):**
```bash
ssh ... "cd /opt/trading-commercial && \
  gunzip -c data/backups/daily/trading_commercial-<TS>.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db-backup psql -d trading_commercial"
```

### Cloudflare R2 offsite backup (recommended)

**Status:** Compose service `r2-backup` siap pakai (image `rclone/rclone:latest`), default DISABLED. Enable saat butuh disaster recovery cloud-side.

**Yang di-backup ke R2:**
- `data/backups/` (DB pg_dump daily/weekly/monthly) — sync setiap hari 03:00 Asia/Jakarta (1 jam setelah local backup jam 02:00)
- `public/` (branding + CMS images) — sync Sunday 04:00 Asia/Jakarta

**One-time setup:**
1. Login [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → **Create bucket** → name `babahalgo-backups`
2. R2 → **Manage R2 API Tokens** → Create API token:
   - Permissions: `Object Read & Write`
   - Specify bucket: `babahalgo-backups`
   - TTL: 1 year (renew before expiry)
3. Catat: **Access Key ID**, **Secret Access Key**, **Account ID** (di sidebar R2)
4. Edit `.env` di VPS3:
   ```bash
   ssh -i ~/.ssh/id_raspi_ed25519 -p 1983 abdullah@148.230.96.201
   cd /opt/trading-commercial
   nano .env
   # Tambah:
   #   R2_ENABLED=true
   #   R2_ACCOUNT_ID=<account-id>
   #   R2_ACCESS_KEY_ID=<access-key>
   #   R2_SECRET_ACCESS_KEY=<secret>
   #   R2_BUCKET=babahalgo-backups
   #   # Untuk EU jurisdiction (default US, auto dari ACCOUNT_ID kalau kosong):
   #   R2_ENDPOINT=https://<account-id>.eu.r2.cloudflarestorage.com
   ```
5. Restart r2-backup service:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --force-recreate r2-backup
   docker compose -f docker-compose.prod.yml logs r2-backup --tail=10
   # Cek log: "r2-backup ready (R2_ENABLED=true, bucket=babahalgo-backups)"
   ```
6. Test manual sync (immediate):
   ```bash
   docker compose -f docker-compose.prod.yml exec r2-backup /usr/local/bin/do-r2-sync.sh backups
   docker compose -f docker-compose.prod.yml exec r2-backup /usr/local/bin/do-r2-sync.sh public
   ```

**Verifikasi di R2:**
- Cloudflare dashboard → R2 → bucket `babahalgo-backups` → harusnya ada `backups/daily/...sql.gz` + `public/logo/*.png`

**Restore dari R2 (saat disaster):**
```bash
# Download backup dari R2 ke VPS3 local
ssh ... "cd /opt/trading-commercial && \
  docker compose -f docker-compose.prod.yml exec r2-backup \
    rclone copy r2:babahalgo-backups/backups/daily/<file>.sql.gz /local/backups/daily/"

# Restore ke postgres
ssh ... "cd /opt/trading-commercial && \
  gunzip -c data/backups/daily/<file>.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db-backup psql -d trading_commercial"
```

**Cost:** R2 free tier 10 GB storage + 10M Class A ops + 1M Class B ops/bulan. Untuk DB backup ~10 MB/hari × (7 daily + 4 weekly + 12 monthly) = ~250 MB/bulan storage, jauh di bawah free tier. Egress R2 GRATIS unlimited.

**Optional — encrypt sensitive backups:** rclone supports `crypt` backend untuk encrypt before upload. Lihat [rclone docs](https://rclone.org/crypt/). Untuk DB dump tidak essential (sudah cukup secure di R2 dengan API token bucket-scoped).

### Migrate postgres host → docker (optional)
Lihat playbook lengkap di header `docker-compose.db.yml`. Ringkas:
1. `pg_dump -Fc` dari host postgres
2. `docker compose down` app
3. Set `DB_HOST=postgres` di `.env`
4. Start dengan kedua compose: `docker compose -f docker-compose.prod.yml -f docker-compose.db.yml up -d postgres`
5. `pg_restore` ke container postgres
6. Start app, verifikasi
7. Setelah stable 7+ hari, disable host postgres

---

## Maintenance — disk cleanup

Production VPS3 sekarang clean (2.4 MB di `/opt/trading-commercial`, 1.8 MB di `/home/abdullah`). Tapi Docker akumulasi cache + image lama seiring waktu. Lakukan periodically (sebulan sekali atau saat disk >70%):

```bash
ssh -i ~/.ssh/id_raspi_ed25519 -p 1983 abdullah@148.230.96.201

# Lihat usage
docker system df

# Prune (safe — tidak hapus image yang sedang aktif)
docker builder prune -af              # build cache (bisa huge: 70+ GB)
docker image prune -af                # unused images
docker volume prune -af               # unused volumes
docker container prune -f             # stopped containers

# Verify
df -h /
docker system df
```

Saved 70+ GB di cleanup pertama 2026-04-26 (dari 80% → 7% disk usage). Anda juga bisa bikin cron tugas mingguan:
```bash
# /etc/cron.d/docker-cleanup (root)
0 3 * * 0 root docker builder prune -af >/dev/null 2>&1
```

---

## Rollback strategy

### Cepat — rollback ke image sebelumnya
Setiap commit ke `main` di-tag `sha-<short>`. Untuk rollback ke commit X:
```bash
ssh ... "cd /opt/trading-commercial && \
  IMAGE_TAG=sha-<previous-sha> docker compose -f docker-compose.prod.yml up -d --force-recreate"
```

### Lambat — revert commit + push
```bash
git revert <bad-commit>
git push origin main
```
GitHub Actions akan otomatis build + deploy versi reverted.

---

## Troubleshooting

### CI workflow gagal: "DOCKER_USERNAME secret tidak tersedia"
Setup secrets per seksi "Required GitHub Secrets" di atas.

### Deploy job gagal di SSH setup: `ssh-keyscan` exit 1
Transient network issue — workflow sudah handle dengan `|| true` + StrictHostKeyChecking=accept-new. Re-run kalau tetap gagal.

### Deploy job gagal di "Sync compose files": `scp: remote mkdir "***/": No such file or directory`
**Root cause:** Secret `VPS3_DEPLOY_PATH` di-set dari Git Bash → MSYS path conversion mengubah `/opt/trading-commercial` jadi `C:\Program Files\Git\opt\trading-commercial` SEBELUM dikirim ke GitHub.

**Fix:**
```bash
MSYS_NO_PATHCONV=1 gh secret set VPS3_DEPLOY_PATH --body "/opt/trading-commercial"
```

### Cleanup step gagal: `rm: Permission denied`
File root-owned di `/opt/trading-commercial` (e.g., `customer-vps-template/`). Workflow sudah handle `continue-on-error: true` + try `sudo -n`. Kalau sudo butuh password, manual cleanup sekali:
```bash
ssh ... "sudo rm -rf /opt/trading-commercial/<offending-path>"
```

### Container gagal start setelah deploy
```bash
ssh ... "cd /opt/trading-commercial && \
  docker compose -f docker-compose.prod.yml logs app --tail=100"
```
Common issues:
- `.env` kekurangan variable wajib (`JWT_SECRET`, `LICENSE_MW_MASTER_KEY`, `VPS1_BACKEND_URL`, `DB_PASSWORD`)
- Database connection refused → pastikan `host.docker.internal` resolve, postgres listen di `172.17.0.1`
- Port conflict → 3000 sudah dipakai service lain

### Docker compose warning: "variable X is not set"
Variables shell di entrypoint heredoc harus di-escape dengan `$$` (compose interpretation). Sudah fixed di `docker-compose.prod.yml` commit `61018e0`.

### `gh run watch` keluar EXIT=0 tapi step ada yang failed
`gh run watch --exit-status` cuma cek workflow conclusion, bukan per-step. Verify manual:
```bash
gh run view <run-id> --json status,conclusion,jobs --jq '.jobs[] | .name + ": " + .conclusion'
```

---

## Cost & maintenance burden

| Item | Cost | Catatan |
|---|---|---|
| GitHub Actions | Free 2000 min/bulan | Build ~3 min × deploy frequency. Estimasi 20-30 min/bulan untuk traffic normal |
| Docker Hub | Free tier | Public repo unlimited storage + pulls authed |
| GHA cache | Auto-evict via housekeeping | Keep 3 latest |
| VPS3 disk | Periodic prune | `docker system prune` sebulan sekali |
| Image registry | Auto-clean via tag rotation | Old `sha-*` tags di-keep selamanya — manual delete via Docker Hub UI kalau perlu |

---

## Lessons learned (post-mortem 2026-04-26 launch)

1. **MSYS path conversion** — Windows Git Bash auto-translate `/foo/` → `C:\Program Files\Git\foo\`. Pakai `MSYS_NO_PATHCONV=1` saat set secret yang punya unix path.
2. **scp SFTP-based di OpenSSH 9+** — bisa fail multi-file copy ke remote dir. Workaround: `tar | ssh` pipe lebih reliable.
3. **docker-compose YAML `$VAR` interpretation** — compose interpret `$` sebelum container start. Escape dengan `$$` untuk pass literal `$` ke shell di container.
4. **`@swc/helpers` peer dep** — next-intl require `>=0.5.17`, next 14 brings 0.5.5. Pin di package.json devDeps.
5. **deploy gate `if: github.event_name == 'push'`** — block manual workflow_dispatch deploy. Buka untuk keduanya: `(push || workflow_dispatch) && ref == 'main'`.
6. **`continue-on-error: true` di cleanup step** — file root-owned bisa block deploy walaupun container sudah healthy. Make cleanup non-fatal + try `sudo -n` fallback.
7. **GitHub secrets write-only by design** — tidak bisa export dari project A ke project B. Re-paste PAT atau generate baru per project.
