# CVP Studio 0.1.2

> Docker healthcheck correction: the Next.js standalone server now binds to `0.0.0.0`, allowing the internal healthcheck to reach `/api/health`.

# CVP Studio 0.1

**One canonical video. Every platform. One source of truth.**

CVP Studio is a complete Dockerized MVP and reference implementation of the Creator Video Portability Protocol. A creator uses the web interface to upload a video, enter universal metadata, choose destinations, define rights and publish. No CLI is required.

## Included

- Professional responsive landing page and creator dashboard
- Public interactive demo page
- Resumable 4 MB browser uploads with progress
- SHA-256 source fingerprint and canonical `cvp:video:<uuid>` identity
- ffprobe metadata extraction and ffmpeg thumbnail generation
- Digest-verified CVP manifest, platform receipt and capability JSON schemas
- Video library, video workspace, audit trail and editable universal metadata
- One-click metadata propagation and global unpublish from the browser
- Background worker for analysis, scheduled publishing and analytics synchronization
- Encrypted platform credentials using AES-256-GCM
- YouTube OAuth web flow
- Dailymotion, Vimeo and PeerTube connection forms
- Live adapter implementations plus deterministic safe mock adapters
- Canonical website asset adapter with HTTP range support
- Universal analytics dashboard
- Atomic JSON metadata persistence in a Docker volume

## Start in one command

```bash
cp .env.example .env
# Change APP_ENCRYPTION_KEY before a real deployment.
docker compose up --build -d
```

Open:

- Product: `http://localhost:3080`
- Public demo: `http://localhost:3080/demo`
- Studio: `http://localhost:3080/studio`
- Upload: `http://localhost:3080/studio/publish`
- Connections: `http://localhost:3080/studio/connections`

The default mode is `mock`, so the full experience works without API credentials and no file leaves the local Docker volume.

## Live publishing

1. Keep mock mode while testing the UI and data flow.
2. Configure the required platform credentials in the Connections page.
3. Configure YouTube OAuth variables in `.env` when YouTube is required.
4. Set `CVP_PUBLISH_MODE=live`.
5. Restart the app and worker:

```bash
docker compose up -d --force-recreate
```

The user still publishes entirely through the web interface. The command above is only an administrator deployment command.

## YouTube OAuth

Create a Google OAuth web application and configure this exact callback by default:

```text
http://localhost:3080/api/oauth/youtube/callback
```

Then set:

```env
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REDIRECT_URI=http://localhost:3080/api/oauth/youtube/callback
```

For a public domain, replace localhost in both Google Cloud and `.env`.

## Data

The Docker volume stores:

```text
/data/cvp-store.json
/data/uploads/
/data/thumbs/
/data/manifests/
```

## Architecture

```text
Browser UI
  ├─ resumable upload API
  ├─ metadata / rights / destination wizard
  ├─ library, analytics and connections
  └─ public demo
          │
          ▼
CVP Studio server
  ├─ Atomic JSON metadata store
  ├─ encrypted credentials
  ├─ CVP manifest generator
  └─ asset range gateway
          │
          ▼
CVP worker
  ├─ ffprobe / ffmpeg
  ├─ scheduled publishing
  ├─ YouTube adapter
  ├─ Dailymotion adapter
  ├─ Vimeo adapter
  ├─ PeerTube adapter
  ├─ website adapter
  └─ analytics synchronization
```

## Important production limitations

This package is a strong MVP/reference implementation, not a turnkey mass-scale SaaS. Before exposing it to multiple unrelated customers, add user authentication, tenant isolation, rate limiting, antivirus/media safety scanning, object storage, queue infrastructure, secrets management, database backups and platform-specific compliance review.

Live adapters can only use features exposed by official APIs. They cannot bypass platform quotas, audits, monetization eligibility, copyright systems, moderation or account restrictions.

## Official platform references

- YouTube Data API `videos.insert`: https://developers.google.com/youtube/v3/docs/videos/insert
- Dailymotion video upload workflow: https://developers.dailymotion.com/docs/upload-videos
- Vimeo upload API: https://developer.vimeo.com/api/upload/videos
- PeerTube REST API: https://docs.joinpeertube.org/api-rest-reference
# castporter
