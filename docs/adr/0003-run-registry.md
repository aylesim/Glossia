# ADR 0003 — In-process run registry on `globalThis`, file-backed runs

## Status

Accepted for the POC.

## Context

A run starts in `POST /api/runs` and is consumed by `GET /api/runs/[id]/stream`. In Next.js, the two route handlers can be evaluated in separate module graphs. A module-level `Map` gave the POST route one view and the SSE route another: the stream returned 404 even though the run existed.

## Decision

- Pin the active run registry to `globalThis` so all route handlers in the process share it.
- Buffer every event with a monotonic sequence number; the SSE route replays from `Last-Event-ID`.
- Persist finished runs as JSON under `.data/runs/` for the run page and later inspection.
- Keep the cache on `globalThis` too, with a `CACHE_VERSION` salt.

## Consequences

- Works reliably in a single Node process (dev, a VM, a container with one replica).
- Does not work across multiple instances. For that, replace the registry with Redis Streams / Postgres `LISTEN/NOTIFY` and the file store with a database; the store interface is the seam.
- `.data/` is gitignored and serverless filesystems are ephemeral, so a portfolio deployment should either use one node with a volume or move to a database.
