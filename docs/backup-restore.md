# Backup & Restore

> A backup you have never restored is a rumor. Run a restore drill on a
> staging/test cluster after setup and after every major release.

---

## 1 · Strategy (two layers, pick both for real operations)

| Layer | What | Cadence | Notes |
| ----- | ---- | ------- | ----- |
| **Atlas Cloud Backup / snapshots** | point-in-time by Atlas | continuous (paid) or daily snapshots | the easiest real recovery |
| **Logical `mongodump` archives** | operator-controlled dumps | daily via cron, off-VPS copy | cluster-independent, restore-anywhere |

Both protect the SAME six collections (plus the `sessions` infrastructure
collection; sessions are disposable — losing them just logs people out,
do not treat them as precious).

## 2 · Atlas Cloud Backup

Atlas → your-cluster → Backup → enable snapshots, choose retention (keep
7 daily + 4 weekly for V1 traffic). Restores happen through Atlas
("Restore" → choose snapshot/point-in-time → restore into the SAME or a
NEW cluster). Verify: after restore, `/api/ready` answers `200` and the
tenant tables count plausibly against the restore host.

## 3 · Logical backups (operator-driven)

On the VPS as `deploy` (Atlas IP must allow the VPS):

```bash
sudo apt install -y mongodb-database-tools
mkdir -p ~/backups

# one-line daily dump (keep 14 days)
cat > ~/backups/dump.sh <<'EOF'
#!/bin/sh
set -eu
STAMP=$(date +%Y%m%d-%H%M%S)
mongodump "$MONGODB_URI_BACKUP" --out="$HOME/backups/$STAMP" --db=meridian
find "$HOME/backups" -maxdepth 1 -type d -name "2*" -mtime +14 -exec rm -rf {} +
EOF
chmod +x ~/backups/dump.sh

# schedule: 03:30 UTC daily
(crontab -l 2>/dev/null; echo "30 3 * * * MONGODB_URI_BACKUP='mongodb+srv://USER:PASSWORD@HOST/meridian' $HOME/backups/dump.sh") | crontab -
```

**Copy dumps OFF the VPS** (restic/rclone to your bucket of choice, or
periodic secure download). A backup on the same machine as the failure
protects against deletion mistakes, not the hardware/host loss.

## 4 · Restore procedure (`mongorestore`)

Restore is a **full-database** operation. Steps — drill them before you need them:

```bash
# 1) stop the app so nothing writes mid-restore
pm2 stop meridian

# 2) identify the dump day you want
ls ~/backups

# 3) restore INTO the database (drop is deliberate and explained below)
mongorestore "MONGODB_URI=PRODUCTION_STRING" \
  --drop --db=meridian "$HOME/backups/2026MMDD-HHMMSS/meridian"

# 4) rebuild indexes (createIndexes is safe idempotent)
npx tsx scripts/ensure-indexes.ts

# 5) verify, then serve
pm2 start ecosystem.config.cjs
curl -fsS http://127.0.0.1:3000/api/ready
```

What `--drop` does: every restored collection is dropped FIRST (you get
exactly the dump's state — the only way to know precisely what you'll
have). Never run it against the wrong database name; using `--nsFrom` /
`--nsTo` remaps if you must restore into a scratch database first
(recommended first pass when unsure):

```bash
mongorestore "$URI" --nsFrom='meridian.*' --nsTo='meridian_restore_check.*' ~/backups/DAY/meridian
# sanity-check counts, then perform the real --drop restore you verified
```

## 5 · Restore testing (mandatory cadence)

Monthly, or after each release: run procedure §4 against a TEMP database
(`--nsTo=meridian_verify.*`), compare the six collection counts against
production, spot-check one tenant + one package + one status timeline,
then drop the verify database. Log the drill date; the checklist item in
`docs/production-checklist.md` exists for recording it.

## 6 · Disaster scenarios cross-reference

VPS loss → rebuild from this doc + `docs/deployment.md` (Atlas survives).
Atlas outage → watch `/api/ready` go 503; app stays up, degraded; data
restores from §4 once back. Bad app release → `docs/deployment.md §9`
rollback; NEVER a database restore for application bugs.
