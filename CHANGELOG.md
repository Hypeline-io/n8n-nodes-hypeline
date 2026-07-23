# Changelog

## 0.1.0

Initial release.

- **Hypeline Trigger** node: self-registering, HMAC-verified webhook trigger
  that fires a workflow on new-content events and tears down only what it
  created.
- **Hypeline** action node: Source, Alert, and Destination CRUD over the public
  REST API.
- **Hypeline API** credential: `hype_` bearer key with a live test request.
- Webhook signatures verified with `node:crypto` only (zero runtime
  dependencies).
