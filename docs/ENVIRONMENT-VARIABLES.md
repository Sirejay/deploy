# Environment Variables

This document is the reference for every environment variable used by the
backend, the frontend, and the Kubernetes deployment manifests
(`k8s/configmap.yaml`, `k8s/secrets.yaml`). Names here match what the backend
code actually reads — `.env.example` and the manifests must stay in sync with
this list.

## Stellar / Soroban

| Variable | Secret | Description |
| --- | --- | --- |
| `STELLAR_NETWORK` | no | `testnet` or `mainnet`. |
| `STELLAR_RPC_URL` | no | Soroban RPC endpoint (e.g. `https://soroban-testnet.stellar.org`). |
| `STELLAR_HORIZON_URL` | no | Horizon endpoint used for account / payment lookups. |
| `STELLAR_NETWORK_PASSPHRASE` | no | Network passphrase matching `STELLAR_NETWORK`. |
| `STELLAR_AGENT_CONTRACT_ID` | no | Contract ID of the agent registry contract. |
| `STELLAR_REGISTRY_CONTRACT_ID` | no | Contract ID of the registry contract. |
| `STELLAR_ESCROW_CONTRACT_ID` | no | Contract ID of the escrow contract. |
| `USDC_CONTRACT_ID` | no | Contract ID of the USDC token contract. |
| `AGENT_SECRET_KEY` | **yes** | Stellar secret key (`S...`) used by the agent signer. |
| `REGISTRY_SECRET_KEY` | **yes** | Stellar secret key (`S...`) used by the registry signer. |

## Supabase

| Variable | Secret | Description |
| --- | --- | --- |
| `SUPABASE_URL` | no | Supabase project URL. |
| `SUPABASE_ANON_KEY` | no | Supabase anon/public key (safe for the frontend). |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Supabase service role key (backend only). |

## LLM providers

| Variable | Secret | Description |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | **yes** | OpenRouter API key used by the agent runtime. |
| `OPENROUTER_MODEL` | no | Default model identifier (optional). |

## Application

| Variable | Secret | Description |
| --- | --- | --- |
| `NODE_ENV` | no | `development` / `production`. |
| `PORT` | no | HTTP port the backend listens on. |
| `LOG_LEVEL` | no | Log verbosity (`debug`, `info`, `warn`, `error`). |
| `CORS_ORIGIN` | no | Allowed frontend origin(s). |
| `NEXT_PUBLIC_API_URL` | no | Backend base URL consumed by the frontend. |

## Notes

- Secret values live only in `k8s/secrets.yaml` (or your secret manager) and
  must never be committed with real values.
- Non-secret values live in `k8s/configmap.yaml` and `.env.example`.
- When adding a variable, update the backend reader, `.env.example`,
  `k8s/configmap.yaml` / `k8s/secrets.yaml`, and this document together.
