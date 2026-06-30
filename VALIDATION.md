# CVP Studio validation report

Validated on 2026-06-29 with Node.js 22 and the default mock publishing mode.

## Automated checks

- `npm run typecheck` — passed
- `npm run build` — passed
- Next.js production server health endpoint — passed
- Background worker startup — passed

## End-to-end workflow

A generated two-second MP4 was processed through the same HTTP APIs used by the browser interface:

1. resumable upload session created;
2. binary asset uploaded and finalized;
3. SHA-256 fingerprint and canonical CVP identity created;
4. ffprobe detected a 2-second, 640×360 video;
5. thumbnail and digest-verified manifest generated;
6. publication completed on all five deterministic mock adapters;
7. analytics synchronized from all five destinations;
8. metadata propagated to all five destinations;
9. global unpublish removed all five copies and archived the canonical record.

Final adapter state:

```text
YouTube      REMOVED
Dailymotion  REMOVED
Vimeo        REMOVED
PeerTube     REMOVED
Website      REMOVED
```

Live publishing code paths require platform credentials and must be validated with the owner's actual platform accounts, API quotas and approval status.
