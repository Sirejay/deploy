## Summary

<!-- Briefly describe the problem and the changes introduced by this PR. -->

## Related Issues

<!-- Link the issue(s) resolved, e.g. Closes #12 -->
Closes #

## Verification Checklist

- [ ] Shell scripts pass `shellcheck scripts/*.sh` and `bash -n scripts/*.sh`
- [ ] Node scripts and unit tests pass (`npm test`)
- [ ] Kubernetes manifests render and validate cleanly (`kubectl kustomize k8s/` / `kubeconform -strict`)
- [ ] Documentation in `docs/` or `README.md` has been updated if operational behavior changed
