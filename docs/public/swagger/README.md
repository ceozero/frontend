# Swagger assets

`perfect-panel/backend` is the authoritative source for the v1 API specifications. Its `master` workflow synchronizes every generated top-level `build/swagger/*.json` file into this directory.

`gateway.json` is a legacy frontend dependency used to generate `packages/ui/src/services/gateway`. The backend generator does not own or overwrite it. It was migrated unchanged from the retired documentation repository at commit `67ff73b7` and must not be replaced with `edge.json`.
