# Contributing to SynapsVault Deploy

Thank you for contributing to `SynapsVault/deploy`! This repository contains the deployment scripts, Dockerfiles, Kubernetes Kustomize manifests, monitoring configurations, and operational runbooks for the SynapsVault platform.

---

## 1. Prerequisites & Setup

Ensure the following tools are installed on your workstation:

- **Node.js `>= 22.12.0`** (required by `@stellar/stellar-sdk` v17+; see `.nvmrc`):
  ```bash
  nvm use
  node --version
  npm ci
  ```
- **Bash & ShellCheck** (for validating operational scripts under `scripts/*.sh`):
  ```bash
  shellcheck --version
  ```
- **kubectl & kubeconform** (optional locally; used to validate `k8s/` manifests):
  ```bash
  kubectl kustomize k8s/ > /dev/null
  ```
- **Docker & Docker Compose** (optional locally; used to validate `docker-compose.yml` and build container images).

### Local Stack Setup

To spin up the full local development stack alongside sibling checkouts of `SynapsVault/backend` and `SynapsVault/frontend`:

```bash
git clone https://github.com/SynapsVault/backend  ../backend
git clone https://github.com/SynapsVault/frontend ../frontend
cp .env.example .env
docker compose up --build
```

---

## 2. Running Tests & Quality Checks

All pull requests are verified by `.github/workflows/ci.yml`. Run the following checks locally before opening a pull request:

### Unit Tests
Run the Node.js built-in test runner against `test/**/*.test.cjs`:
```bash
npm test
```

### Linting & Formatting (Node.js Scripts)
Check JavaScript/CommonJS syntax, ESLint rules, and Prettier formatting:
```bash
npm run lint
npm run format:check
```
To automatically format files with Prettier:
```bash
npm run format
```

### Shell Script Linting
Every shell script in `scripts/*.sh` must pass both `shellcheck` and `bash -n`:
```bash
shellcheck scripts/*.sh
for f in scripts/*.sh; do bash -n "$f"; done
```

### Kubernetes & Monitoring Validation
```bash
kubectl kustomize k8s/ > rendered.yaml
kubeconform -strict -summary rendered.yaml
kubeconform -strict -summary k8s/secrets.yaml
python3 -m json.tool monitoring/grafana-dashboard.json > /dev/null
```

---

## 3. Repository Conventions

### Node.js Scripts (`scripts/*.js`, `scripts/*.cjs`)
- **Module format**:The package defaults to ES Modules (`"type": "module"`). Step scripts (`01`–`06`) use ESM (`.js`), while the standalone contract deployment/rollback CLI tools (`deploy-contracts.cjs`, `rollback-contracts.cjs`) use CommonJS (`.cjs`) so their pure helpers can be required directly by `test/*.test.cjs`.
- **Exit codes**: Scripts must exit non-zero (`process.exit(1)`) whenever required environment variables are missing, validation fails, or an API/RPC step fails. Never silently swallow errors.
- **No hard-coded secrets or mainnet defaults**: Default to `testnet` and require explicit confirmation (`--yes` in CI) before executing destructive or mainnet operations.
- **Offline unit tests**: Keep CLI argument parsing, environment validation, and file helpers exported so they can be unit-tested offline in `test/` without live RPC or Friendbot calls.

### Shell Scripts (`scripts/*.sh`)
- Start with `#!/usr/bin/env bash` and strict mode (`set -Eeuo pipefail` or `set -euo pipefail`).
- Quote all variable expansions (`"${VAR}"`) and keep scripts clean under `shellcheck`.
- Document supported flags, environment variables, and exit codes in the header comment block so `--help` stays accurate.

### Kubernetes Manifests (`k8s/`)
- Keep real secrets out of version control. `k8s/secrets.yaml` is a placeholder template and must **not** be added to `k8s/kustomization.yaml`.
- All workloads must run as non-root with `allowPrivilegeEscalation: false` and explicit resource requests/limits.

### Commit Messages & Pull Requests
- Use Conventional Commits (`feat(k8s): ...`, `fix(scripts): ...`, `docs: ...`, `test: ...`, `chore: ...`).
- Reference the issue(s) resolved in the commit body and PR description (e.g., `Closes #38`).
- Keep changes focused and ensure all CI jobs pass.
