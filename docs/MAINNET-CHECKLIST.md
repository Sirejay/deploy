# Mainnet Readiness Checklist

This checklist must be completed and signed off before deploying to mainnet. Testnet success alone is not sufficient — mainnet requires dedicated infrastructure, hardened key custody, audited contracts, and monitoring sign-off.

## 1. Dedicated RPC Configuration

- [ ] Provision dedicated (non-shared, non-public) RPC endpoints for mainnet — do not reuse testnet or public providers.
- [ ] Configure at least two independent RPC providers for redundancy and failover.
- [ ] Set `RPC_URL` / provider config to the mainnet endpoints in the production environment only.
- [ ] Verify chain ID and network parameters match mainnet exactly.
- [ ] Confirm rate limits and quotas on the dedicated RPC plan are sufficient for expected traffic.
- [ ] Test failover behavior when the primary RPC is unavailable.
- [ ] Restrict RPC credentials to the production deployment environment (no secrets in the repo).

## 2. Key Custody

- [ ] Deployer and admin keys are generated and stored in a hardware wallet or managed KMS/HSM — never in plaintext files or env vars committed to source.
- [ ] Production keys are distinct from any testnet or development keys.
- [ ] Key access is limited to named operators with documented responsibilities.
- [ ] A key rotation and recovery procedure is documented and rehearsed.
- [ ] Backup/recovery material is stored securely and offline, with access controls.
- [ ] No private keys, mnemonics, or seed phrases exist in the repository, CI logs, or chat history.

## 3. Contract Audits

- [ ] All contracts slated for mainnet have completed an independent third-party security audit.
- [ ] All critical and high severity audit findings are resolved and re-verified.
- [ ] Medium/low findings are either fixed or explicitly accepted with documented rationale.
- [ ] The audited commit hash matches the exact bytecode to be deployed.
- [ ] Deployment scripts and constructor parameters have been reviewed against the audit scope.

## 4. Admin Key Handling

- [ ] Admin/owner roles are assigned to a multisig or timelock — not a single EOA — where the design allows.
- [ ] Ownership transfer steps are scripted and verified on a fork before execution.
- [ ] Privileged functions (upgrades, pauses, parameter changes) are documented with their required signers.
- [ ] Emergency pause/upgrade procedures are documented and tested.
- [ ] Admin actions emit events suitable for monitoring and post-hoc review.

## 5. Monitoring & Sign-off

- [ ] On-chain monitoring and alerting are configured for critical contracts and admin actions.
- [ ] Dashboards cover transaction success rate, gas usage, and balance thresholds.
- [ ] Alert routing (on-call, escalation) is confirmed with the responsible team.
- [ ] Logging and error reporting are enabled for the production deployment.
- [ ] A rollback/incident response plan is documented.
- [ ] Final go/no-go sign-off is recorded from engineering, security, and operations owners.

## Sign-off

| Area | Owner | Date | Status |
| --- | --- | --- | --- |
| Dedicated RPC | | | |
| Key custody | | | |
| Contract audits | | | |
| Admin key handling | | | |
| Monitoring | | | |
