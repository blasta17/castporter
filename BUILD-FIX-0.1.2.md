# CVP Studio 0.1.2 — Docker healthcheck fix

## Symptom

Next.js reports `Ready`, but Docker keeps `cvp-studio` in `health: starting` or eventually marks it `unhealthy`. Consequently, `cvp-worker` does not start because it depends on `cvp-studio` being healthy.

## Root cause

Docker automatically defines the `HOSTNAME` environment variable as the container ID. The Next.js standalone server uses that value as its bind host. It therefore listened on the container hostname/IP instead of all interfaces, while the healthcheck tried `127.0.0.1:3000`.

## Fix

- Force `HOSTNAME=0.0.0.0` in the runtime image.
- Keep the healthcheck on `127.0.0.1`.
- Use Node's built-in `http` module rather than `fetch`.
- Add a 20-second healthcheck start period.

## Rebuild

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose ps
```

Expected result:

```text
cvp-studio   Up ... (healthy)
cvp-worker   Up ...
```
