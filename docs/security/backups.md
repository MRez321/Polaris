# Backups Security

`backend/src/modules/backups/` — routes under `/api/workshop/backups` (admin + explicit permissions).

## Concurrency lock (P0-A-10)

Module-level `backupRunning` flag in `backupService.ts` guards `runBackup` and `triggerCpanelFullBackup`. A second concurrent run gets:

- HTTP 409, `{"error": "یک عملیات پشتیبان‌گیری دیگر در حال اجراست؛ تا پایان آن صبر کنید"}`

Verified: 4 parallel `/backups/run` POSTs → one 201 + three 409s. Prevents backup-file overwrite races and doubles as DoS protection for the mysqldump/tar pipeline.

## Path traversal defense

Backup ids are base64url of the filename. `downloadBackup`/`deleteBackup` validate that the decoded id resolves inside `BACKUPS_DIR` (path.resolve + prefix check). Anything else → 404.

Verified (`scripts/smoke-security.mjs` §8): `../.env`, `..%2F`, base64url-encoded `..\package.json` → 404 on both download and delete.

## Download auditing (P0-A-10)

Every `GET /backups/:id/download` writes an `audit_logs` row: action `read`, entity `backup`, details = filename + user + IP. Backup reads are as sensitive as writes — they contain the full customer/order dataset.

## Process hygiene

- mysqldump receives the DB password via the `MYSQL_PWD` environment variable — never `--password=` argv (visible in `ps` output to other users on shared hosting).
- cPanel full-backup trigger: UAPI `POST :2083/execute/Backup/fullbackup` with `Authorization: cpanel <user>:<token>` — the cpanel token is stored in `backup_settings` (masked at the API boundary like all credentials).
- Spawned with `shell: false` throughout; binaries resolved from env override (`MYSQLDUMP_PATH`/`TAR_PATH`) → PATH → common install dirs.

## Retention & storage

- Files under `backend/backups/` (gitignored; only `.gitkeep` tracked) named `<kind>-YYYYMMDD-HHmmss.*`; automatic backups prefixed `auto-`.
- Pruning enforces the configured `retention` count on every listing/run.
