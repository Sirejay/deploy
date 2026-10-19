# Monitoring on Kubernetes

The monitoring stack (Prometheus, Alertmanager, Grafana) is deployed to
Kubernetes with the [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
Helm chart. The manifests in `monitoring/` provide the pieces that are specific
to this project:

- `monitoring/servicemonitors.yaml` — `ServiceMonitor` resources so Prometheus
discovers the backend and frontend targets via Kubernetes service discovery
(instead of the static docker-compose targets in `prometheus.yml`).
- `monitoring/prometheusrule.yaml` — the alert rules from
`monitoring/alert-rules.yml` loaded as a `PrometheusRule` custom resource.

## Prerequisites

- A Kubernetes cluster with `kubectl` configured
- [Helm 3](https://helm.sh/docs/intro/install/)

## Install kube-prometheus-stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword="$GRAFANA_ADMIN_PASSWORD"
```

Wait for the operator and Prometheus to become ready:

```bash
kubectl -n monitoring rollout status deploy/monitoring-kube-prometheus-operator
kubectl -n monitoring rollout status statefulset/prometheus-monitoring-kube-prometheus-prometheus
```

## Apply the project monitoring resources

```bash
kubectl apply -f monitoring/servicemonitors.yaml
kubectl apply -f monitoring/prometheusrule.yaml
```

## Verify

- Prometheus targets: port-forward the Prometheus service and open
  **Status → Targets**; the `backend` and `frontend` jobs should be `UP`.

  ```bash
  kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-prometheus 9090
  ```

- Alert rules: open **Status → Rules** and confirm the project alert group is
  loaded.
- Grafana: port-forward the Grafana service and log in with the admin password.

  ```bash
  kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80
  ```

## Notes

- The `ServiceMonitor` resources select the backend and frontend `Service`s by
  their labels; keep those labels in sync with `k8s/` manifests.
- The `PrometheusRule` mirrors `monitoring/alert-rules.yml`. When you change the
  alert rules, update both files (or regenerate the `PrometheusRule` from the
  YAML) so Kubernetes and docker-compose stay consistent.
