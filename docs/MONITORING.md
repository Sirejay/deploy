# Monitoring Setup Guide

This guide walks through deploying the observability stack for the application: **Prometheus** (metrics collection), **Grafana** (dashboards), and **Alertmanager** (alert routing). It also covers wiring the backend metrics endpoint so Prometheus can scrape it.

All configuration referenced here lives in the [`monitoring/`](../monitoring) directory.

## Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [1. Wire the backend metrics endpoint](#1-wire-the-backend-metrics-endpoint)
- [2. Deploy Prometheus and Grafana](#2-deploy-prometheus-and-grafana)
  - [Option A: Docker Compose](#option-a-docker-compose)
  - [Option B: Managed services](#option-b-managed-services)
- [3. Import the Grafana dashboard](#3-import-the-grafana-dashboard)
- [4. Load the alert rules](#4-load-the-alert-rules)
- [5. Configure Alertmanager notification channels](#5-configure-alertmanager-notification-channels)
  - [Email](#email)
  - [Slack](#slack)
- [6. Verify the setup](#6-verify-the-setup)
- [Runbooks](#runbooks)
- [Troubleshooting](#troubleshooting)

## Overview

The monitoring stack consists of:

| Component | Purpose | Config file |
| --- | --- | --- |
| Prometheus | Scrapes and stores metrics | [`monitoring/prometheus.yml`](../monitoring/prometheus.yml) |
| Alert rules | Defines alerting conditions | [`monitoring/alert-rules.yml`](../monitoring/alert-rules.yml) |
| Alertmanager | Routes alerts to notification channels | [`monitoring/alertmanager.yml`](../monitoring/alertmanager.yml) |
| Grafana | Visualizes metrics via dashboards | [`monitoring/grafana/`](../monitoring/grafana) |
| Docker Compose | Local/all-in-one deployment | [`monitoring/docker-compose.yml`](../monitoring/docker-compose.yml) |

> Adjust the paths above if your repository layout differs. The steps below assume the `monitoring/` directory at the repository root.

## Prerequisites

- Docker and Docker Compose (for the self-hosted option), **or** accounts with a managed Prometheus/Grafana provider.
- Network access from Prometheus to the backend metrics endpoint.
- SMTP credentials (for email alerts) and/or a Slack incoming webhook URL (for Slack alerts).

## 1. Wire the backend metrics endpoint

Prometheus scrapes metrics over HTTP. The backend must expose a metrics endpoint (commonly `/metrics`) in the Prometheus exposition format.

1. Ensure the backend exposes the metrics endpoint. Confirm it responds:

   ```bash
   curl -s http://localhost:3000/metrics | head
   ```

   You should see lines such as `# HELP ...` and `# TYPE ...` followed by metric samples.

2. Point Prometheus at the endpoint. In [`monitoring/prometheus.yml`](../monitoring/prometheus.yml), the scrape target is defined under `scrape_configs`. Update the target to match your backend host and port:

   ```yaml
   scrape_configs:
     - job_name: "backend"
       metrics_path: /metrics
       static_configs:
         - targets: ["backend:3000"]   # host:port of the backend metrics endpoint
   ```

   - If Prometheus runs in Docker Compose on the same network, use the service name (e.g. `backend:3000`).
   - If Prometheus runs outside the backend's network, use a reachable host/IP (e.g. `host.docker.internal:3000` on Docker Desktop, or the backend's public address).

3. If the metrics endpoint requires authentication, add credentials to the scrape config:

   ```yaml
   scrape_configs:
     - job_name: "backend"
       metrics_path: /metrics
       scheme: https
       basic_auth:
         username: metrics
         password_file: /etc/prometheus/metrics_password
       static_configs:
         - targets: ["backend.example.com:443"]
   ```

   Mount the password file into the Prometheus container and keep it out of version control.

## 2. Deploy Prometheus and Grafana

### Option A: Docker Compose

The repository ships a Compose file at [`monitoring/docker-compose.yml`](../monitoring/docker-compose.yml) that starts Prometheus, Alertmanager, and Grafana together.

1. Review and adjust the Compose file and the referenced config files:
   - [`monitoring/prometheus.yml`](../monitoring/prometheus.yml) — scrape targets and rule file references.
   - [`monitoring/alert-rules.yml`](../monitoring/alert-rules.yml) — alerting rules.
   - [`monitoring/alertmanager.yml`](../monitoring/alertmanager.yml) — notification routing.

2. Start the stack:

   ```bash
   cd monitoring
   docker compose up -d
   ```

3. Confirm the containers are running:

   ```bash
   docker compose ps
   ```

4. Access the UIs:
   - Prometheus: <http://localhost:9090>
   - Alertmanager: <http://localhost:9093>
   - Grafana: <http://localhost:3000> (default credentials `admin` / `admin` — change on first login)

5. To stop the stack:

   ```bash
   docker compose down
   ```

### Option B: Managed services

If you prefer managed infrastructure, use a hosted Prometheus (e.g. Grafana Cloud, Amazon Managed Service for Prometheus, Google Managed Prometheus) and a hosted Grafana.

1. **Prometheus / metrics backend**
   - Create the managed Prometheus instance and note its remote-write endpoint and credentials.
   - Configure your backend (or a local Prometheus agent) to remote-write metrics to the managed endpoint. If you run a local Prometheus agent, reuse [`monitoring/prometheus.yml`](../monitoring/prometheus.yml) for scrape configs and add a `remote_write` block:

     ```yaml
     remote_write:
       - url: https://<managed-prometheus-endpoint>/api/v1/write
         basic_auth:
           username: <user-id>
           password: <api-key>
     ```

2. **Grafana**
   - Create the hosted Grafana instance.
   - Add a data source pointing at the managed Prometheus instance (see [step 3](#3-import-the-grafana-dashboard)).

3. **Alerting**
   - Managed Prometheus services typically support alert rules and Alertmanager-compatible routing. Load the rules from [`monitoring/alert-rules.yml`](../monitoring/alert-rules.yml) into the managed rule store, and configure notification channels in the provider's UI (see [step 5](#5-configure-alertmanager-notification-channels)).

## 3. Import the Grafana dashboard

1. Log in to Grafana.
2. Add the Prometheus data source:
   - Go to **Connections → Data sources → Add data source → Prometheus**.
   - Set the URL to your Prometheus instance (e.g. `http://prometheus:9090` when running in Compose, or the managed endpoint URL).
   - Click **Save & test** and confirm the connection succeeds.
3. Import the dashboard:
   - Go to **Dashboards → New → Import**.
   - Upload the dashboard JSON from [`monitoring/grafana/`](../monitoring/grafana) (or paste its contents).
   - Select the Prometheus data source created above.
   - Click **Import**.
4. The dashboard should now render panels populated by the backend metrics.

> If the dashboard JSON references a data source by name, ensure the name matches the one you created, or update the variable when importing.

## 4. Load the alert rules

Alert rules are defined in [`monitoring/alert-rules.yml`](../monitoring/alert-rules.yml).

1. Ensure Prometheus references the rule file. In [`monitoring/prometheus.yml`](../monitoring/prometheus.yml):

   ```yaml
   rule_files:
     - /etc/prometheus/alert-rules.yml
   ```

   Confirm the Compose file mounts `alert-rules.yml` to that path inside the Prometheus container.

2. Reload Prometheus to pick up rule changes:
   - Via the UI: **Status → Configuration → Reload** (requires `--web.enable-lifecycle`), or
   - Via the API:

     ```bash
     curl -X POST http://localhost:9090/-/reload
     ```

   - Or restart the container:

     ```bash
     docker compose restart prometheus
     ```

3. Verify the rules loaded: go to **Prometheus → Status → Rules** and confirm the rules from `alert-rules.yml` appear.

## 5. Configure Alertmanager notification channels

Alertmanager routing and receivers are configured in [`monitoring/alertmanager.yml`](../monitoring/alertmanager.yml). The examples below show how to add email and Slack receivers. Replace placeholders with your real credentials and keep secrets out of version control.

### Email

```yaml
receivers:
  - name: email
    email_configs:
      - to: oncall@example.com
        from: alerts@example.com
        smarthost: smtp.example.com:587
        auth_username: alerts@example.com
        auth_password_file: /etc/alertmanager/smtp_password
        require_tls: true
```

### Slack

```yaml
receivers:
  - name: slack
    slack_configs:
      - api_url_file: /etc/alertmanager/slack_webhook_url
        channel: '#alerts'
        send_resolved: true
```

Mount the referenced secret files into the Alertmanager container and keep them out of version control.

## 6. Verify the setup

1. Confirm Prometheus targets are up: **Prometheus → Status → Targets**.
2. Confirm rules are loaded: **Prometheus → Status → Rules**.
3. Trigger a test alert (e.g. temporarily lower a threshold) and confirm it reaches Alertmanager and the configured notification channel.
4. Confirm the alert resolves and a resolved notification is delivered (if `send_resolved` is enabled).

## Runbooks

Every alert in [`monitoring/alert-rules.yml`](../monitoring/alert-rules.yml) links to an operational runbook via its `runbook_url` annotation. Runbooks live in [`docs/runbooks/`](./runbooks) — see the [runbook index](./runbooks/README.md) for the full list.

When you add or rename an alert, add a matching runbook under `docs/runbooks/` and point the alert's `runbook_url` at it.

## Troubleshooting

- **No metrics in Prometheus:** check the scrape target, network reachability, and that the backend `/metrics` endpoint responds.
- **Rules not loading:** validate the YAML and confirm the rule file is mounted at the path in `rule_files`.
- **Alerts not delivered:** check Alertmanager logs and confirm receiver credentials/secret files are correct.
- **Dashboard empty:** confirm the Grafana data source points at the correct Prometheus instance.
