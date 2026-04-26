# CI/CD + Deployment Architecture

Dokumen ini menjelaskan bagaimana kode di-build, di-publish, dan di-deploy ke produksi.

## TL;DR

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐    ┌─────────────┐
│  Local dev   │───▶│  GitHub Actions  │───▶│  Docker Hub  │───▶│   VPS3      │
│  git push    │    │  build + push    │    │ babahdigital │    │ docker pull │
│              │    │  smoke test      │    │  /babahalgo  │    │ docker up   │
└──────────────┘    └──────────────────┘    └──────────────┘    └─────────────┘
                       (5-10 menit)            (image cache)      (~30 detik)
```

**Production VPS3 tidak punya source code lagi.** Cuma `docker-compose.prod.yml`, `.env`, dan folder `scratch/` untuk script test/maintenance.

---

## Komponen

### 1. `.github/workflows/ci.yml`
Quality gate pada setiap PR + push ke main.
- Detect path changes (cuma jalankan job yang relevan)
- Typecheck (`tsc --noEmit`)
- Lint (`next lint`)
- Build verify (`next build`, no artifact upload)
- Docker build smoke (no push)

Cancel-in-progress aktif — push baru cancel build lama.

### 2. `.github/workflows/docker-publish.yml`
**Trigger:**
- Push ke `main` → tag `latest` + `sha-<short>` + `main`
- Push tag `v1.2.3` → tag `latest` + `v1.2.3` + `1.2`
- Manual dispatch (input: `skip_deploy`, `cleanup_cache`)

**Job 1 — build-and-push:**
- Build multi-arch (linux/amd64 + linux/arm64) via QEMU + Buildx
- Push ke `babahdigital/babahalgo` di Docker Hub
- Cache via GHA cache (per-scope `babahalgo`)

**Job 2 — deploy:**
- Cuma jalan saat push ke `main` (bukan tag, bukan PR)
- SSH ke VPS3 → `docker compose pull + up -d --force-recreate`
- Polling healthcheck max 60 detik
- Smoke test public endpoints (`/api/health`, `/api/public/capabilities`, `/pricing`)
- Fail loud kalau healthcheck gagal — auto-rollback bukan otomatis (lihat seksi Rollback)

### 3. `.github/workflows/actions-housekeeping.yml`
Cron 2x/hari: hapus workflow runs lama (keep 5 latest per workflow) + cache lama (keep 3).

---

## Required GitHub Secrets

Buka https://github.com/babahdigital/trading-frontend/settings/secrets/actions dan tambahkan:

| Secret | Value | Catatan |
|---|---|---|
| `DOCKER_USERNAME` | `babahdigital` | Sama dengan project lain |
| `DOCKER_PASSWORD` | `<Docker Hub access token>` | Pakai PAT, bukan password akun. Generate di https://hub.docker.com/settings/security |
| `VPS3_SSH_HOST` | `148.230.96.201` | |
| `VPS3_SSH_PORT` | `1983` | |
| `VPS3_SSH_USER` | `abdullah` | |
| `VPS3_SSH_KEY` | `<isi ~/.ssh/id_raspi_ed25519>` | Full PEM private key, termasuk header/footer `-----BEGIN/END OPENSSH PRIVATE KEY-----` |
| `VPS3_DEPLOY_PATH` | `/opt/trading-commercial` | |

**Tip:** Kalau pakai existing key, copy isinya:
```bash
cat ~/.ssh/id_raspi_ed25519
```

---

## Folder layout di VPS3 (target state)

```
/opt/trading-commercial/
├── docker-compose.prod.yml   # config utama (di-clone dari repo, jarang berubah)
├── docker-compose.db.yml     # OPTIONAL: postgres-in-docker
├── .env                       # secrets (NEVER commit ke git)
├── data/
│   ├── postgres/              # postgres data volume (kalau pakai docker postgres)
│   └── backups/
│       ├── daily/             # 7 backup terakhir (auto-prune)
│       ├── weekly/            # 4 minggu terakhir (Sunday snapshot)
│       └── monthly/           # 12 bulan terakhir (snapshot tgl 01)
├── public/                    # branding/CMS images, hot-swap tanpa rebuild
└── scratch/                   # one-off test/maintenance scripts (RO mount)
```

**Keuntungan layout ini:**
- Update kode → cuma `docker pull` (no source di prod)
- Update branding/logo → drop file ke `./public/`, no rebuild
- Backup otomatis → `./data/backups/` retention 7+4+12
- Restore mudah → file `.sql.gz` siap pakai di host filesystem
- Bisa migrate postgres ke docker tanpa ubah app config

---

## Migration ke pull-based deploy (one-time setup di VPS3)

Sekali-saja prosedur untuk pindah dari "build-on-prod" ke "pull-image". Setelah ini selesai, semua deploy berjalan otomatis dari `git push`.

### Step 1 — Push CI/CD scaffolding ke main
```bash
git push origin main
```
GitHub Actions akan build + push `babahdigital/babahalgo:latest` ke Docker Hub. Verifikasi di https://hub.docker.com/r/babahdigital/babahalgo.

### Step 2 — Setup folder + compose di VPS3
```bash
ssh -i ~/.ssh/id_raspi_ed25519 -p 1983 abdullah@148.230.96.201

cd /opt/trading-commercial

# Backup current state (rollback safety net)
sudo cp -a /opt/trading-commercial /opt/trading-commercial.backup-$(date +%Y%m%d)

# Stop existing container
docker compose down

# Pull compose files dari main (cuma 2 file kecil, no source code)
curl -fsSL -o docker-compose.prod.yml \
  https://raw.githubusercontent.com/babahdigital/trading-frontend/main/docker-compose.prod.yml
curl -fsSL -o docker-compose.db.yml \
  https://raw.githubusercontent.com/babahdigital/trading-frontend/main/docker-compose.db.yml

# Buat folder structure
mkdir -p data/backups/{daily,weekly,monthly} public scratch
chmod 750 data/backups

# Bootstrap public/ folder dari image default (logos, manifest dll)
docker run --rm -v $(pwd)/public:/dest babahdigital/babahalgo:latest \
  sh -c 'cp -r /app/public/. /dest/ && chown -R 1001:1001 /dest'

# Pull image + start
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Verifikasi
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs app --tail=20
curl -s https://babahalgo.com/api/health
```

### Step 3 — Verifikasi
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs app --tail=30
curl -s https://babahalgo.com/api/health
```

### Step 4 — Cleanup source code (setelah verified stable selama beberapa hari)
**Tunggu 3-7 hari** sambil monitor stabilitas. Setelah yakin, hapus source:

```bash
cd /opt/trading-commercial

# WAJIB sisakan: docker-compose.prod.yml, .env, scratch/
ls

# Hapus source + build artifacts (rollback masih bisa via image registry)
rm -rf src/ public/ prisma/ node_modules/ .next/ dev/ docs/ \
       package.json package-lock.json tsconfig.json next.config.js \
       Dockerfile docker-compose.yml \
       customer-vps-template/ scripts/ \
       .git/ .next/ .vscode/ .eslintrc.json .hintrc

ls -la
# Should show: docker-compose.prod.yml .env scratch/ (plus dotfiles)
```

---

## Daily ops — apa yang perlu Anda lakukan

### Update kode
```bash
# Local
git push origin main
```
**Itu saja.** GitHub Actions handle build + push + deploy. Lihat progress di https://github.com/babahdigital/trading-frontend/actions.

### Manual deploy (skip CI build, untuk hotfix dari image yang sudah ada)
```bash
# Re-pull latest image dan restart, dari local terminal
ssh -i ~/.ssh/id_raspi_ed25519 -p 1983 abdullah@148.230.96.201 \
  "cd /opt/trading-commercial && docker compose -f docker-compose.prod.yml pull app && docker compose -f docker-compose.prod.yml up -d --force-recreate app"
```

### Manual deploy specific image version
```bash
ssh -i ~/.ssh/id_raspi_ed25519 -p 1983 abdullah@148.230.96.201

cd /opt/trading-commercial
# Edit .env, tambah:
# IMAGE_TAG=sha-41b7332    (atau v1.2.3, atau main)
docker compose -f docker-compose.prod.yml up -d --force-recreate app
```

### Run prisma migration di prod
```bash
ssh -i ~/.ssh/id_raspi_ed25519 -p 1983 abdullah@148.230.96.201
cd /opt/trading-commercial
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Run scratch / one-off script
1. Copy ke VPS3:
   ```bash
   scp -i ~/.ssh/id_raspi_ed25519 -P 1983 my-script.ts \
     abdullah@148.230.96.201:/opt/trading-commercial/scratch/
   ```
2. Execute dalam container (volume `./scratch:/app/scratch:ro`):
   ```bash
   ssh ... "cd /opt/trading-commercial && docker compose -f docker-compose.prod.yml exec app npx tsx /app/scratch/my-script.ts"
   ```

### Update branding / public assets (logo, favicon, banner CMS)
```bash
# Edit/upload langsung ke ./public/ — no rebuild needed, Next.js serve static dari volume
scp -i ~/.ssh/id_raspi_ed25739 -P 1983 my-new-logo.png \
  abdullah@148.230.96.201:/opt/trading-commercial/public/logo/
# Hard refresh di browser (Cmd+Shift+R) — file langsung ter-serve
```

### DB Backup operations

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

### Migrate postgres dari host ke docker (optional, kalau mau self-contained)
Lihat playbook lengkap di header `docker-compose.db.yml`. Ringkas:
1. `pg_dump -Fc` dari host postgres
2. `docker compose down` app
3. Set `DB_HOST=postgres` di `.env`
4. `docker compose -f docker-compose.prod.yml -f docker-compose.db.yml up -d postgres`
5. `pg_restore` ke container postgres
6. Start app, verifikasi
7. Setelah stable 7+ hari, disable host postgres

---

## Rollback strategy

### Cepat — rollback ke image sebelumnya
Setiap commit ke `main` di-tag `sha-<short>`. Untuk rollback ke commit X:
```bash
ssh ... "cd /opt/trading-commercial && \
  IMAGE_TAG=sha-<previous-sha> docker compose -f docker-compose.prod.yml up -d --force-recreate app"
```

Atau kalau panic: `docker rollback` via Docker Hub UI tidak ada, tapi Anda bisa:
1. Buka https://hub.docker.com/r/babahdigital/babahalgo/tags
2. Catat sha tag sebelumnya yang masih bagus
3. Set `IMAGE_TAG=<sha-...>` di `.env`
4. Run `docker compose up -d --force-recreate app`

### Lama — revert commit + push
```bash
git revert <bad-commit>
git push origin main
```
GitHub Actions akan otomatis build + deploy versi reverted.

---

## Troubleshooting

### CI workflow gagal: "DOCKER_USERNAME secret tidak tersedia"
Setup secrets per seksi "Required GitHub Secrets" di atas.

### Deploy job gagal: SSH timeout
- Cek `VPS3_SSH_HOST`, `VPS3_SSH_PORT`, `VPS3_SSH_USER` di secrets
- Cek SSH key valid: copy isinya ke file lokal, `chmod 600`, test `ssh -i ./key -p 1983 abdullah@148.230.96.201`
- Pastikan key sudah ada di `~/.ssh/authorized_keys` di VPS3

### Container gagal start setelah deploy
```bash
ssh ... "cd /opt/trading-commercial && \
  docker compose -f docker-compose.prod.yml logs app --tail=100"
```
Common issues:
- `.env` kekurangan variable wajib (`JWT_SECRET`, `LICENSE_MW_MASTER_KEY`, `VPS1_BACKEND_URL`)
- Database connection refused → cek `host.docker.internal` resolve, postgres listen di `172.17.0.1`
- Port conflict → 3000 sudah dipakai service lain

### Image multi-arch tidak match VPS3 arch
VPS3 = amd64. Image tag `latest` punya manifest list amd64 + arm64; Docker akan auto-pick yang sesuai. Tidak perlu intervention.

---

## Cost & maintenance

- **GitHub Actions:** 2000 menit/bulan free (account personal). Build typical ~5 menit. Deploy ~1 menit. Estimasi: ~30-50 menit/bulan untuk traffic normal.
- **Docker Hub:** free tier unlimited pulls dari account auth. Public repo unlimited storage.
- **GHA cache:** auto-evict via housekeeping workflow (keep 3 latest).
- **Storage VPS3:** setelah cleanup source code, /opt/trading-commercial cuma ~few KB. Image cache di docker bersifat add-only — periodic `docker image prune -f` tetap perlu (already in nightly cron? cek `crontab -l`).
