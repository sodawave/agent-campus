# Self-hosting the WA administration panel (summary)

Source: https://docs.workadventu.re/admin/admin-self-hosting/

## Availability

The **SaaS administration dashboard** is not part of the open-source self-host stack most people run. Enterprise self-host of the admin panel is offered for large privacy-sensitive deployments — contact WorkAdventure. Charts: https://charts.workadventu.re

## Architecture (enterprise)

Two Helm charts, same K8s namespace:

1. **Admin panel + members website + WorkAdventure services** (+ admin DB)
2. **Matrix Synapse** (+ persistence)

External: S3-compatible storage (or in-cluster RustFS), TURN (Coturn / Cloudflare), LiveKit (in-cluster or dedicated).

## Sizing (rough)

- Baseline ~4 CPU / 8 GB RAM for WA+admin
- +1 CPU / 1 GB per 100 concurrent users
- +0.5 CPU / 2 GB per OpenAI/Azure map bots
- PVC ~20–30 GB start for DBs

## Domains typically needed

admin, member, matrix, play/WA hosts, optional phpmyadmin, icon, uploader, map-storage wildcard, optional files (RustFS).

## Implication for Agent Campus

Do **not** clone the SaaS admin UI into `apps/control-panel`. Prefer:

- Campus GraphQL control panel for **campus** config (as today)
- Optional **Admin API** implementation so OSS WA Pusher asks campus for map/access/woka (see [admin-api-self-host.md](./admin-api-self-host.md))
