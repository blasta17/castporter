# Creator Video Portability Protocol (CVP) 0.1

CVP defines a platform-independent identity and operation model for publishing one canonical video to many destinations.

## Design goals

1. The canonical video identity must not depend on a platform URL.
2. Every source asset must be fingerprinted.
3. Metadata and rights must remain portable.
4. Every platform operation must produce a receipt.
5. Platform-specific capabilities must be declared rather than assumed.
6. Analytics must map back to the canonical identity.
7. A creator-facing product may implement the protocol without requiring a CLI.

## Canonical identifier

Reference implementations generate UUID-based identifiers:

```text
cvp:video:<uuid>
```

The identifier remains stable when a platform copy is updated, removed or recreated.

## Core documents

### Video manifest

Contains:

- protocol version
- canonical identity
- source asset fingerprint and technical metadata
- creator metadata
- title, description, language, tags and chapters
- owner, license and territories
- known distribution copies
- manifest digest

### Platform receipt

Contains:

- canonical identity
- platform name
- operation
- operation status
- platform video identifier and URL
- completion timestamp
- platform response digest or opaque data

### Capability declaration

A destination may declare support for:

- upload and resumable upload
- metadata update
- chapters
- captions
- scheduling
- visibility controls
- rights territories
- analytics
- monetization
- delete or unpublish

## Operation model

```text
upload → analyze → manifest → negotiate → publish → receipt → synchronize
```

The protocol does not bypass platform policies, API quotas, account eligibility, moderation or copyright systems. An adapter translates CVP operations into APIs that a destination officially exposes.

## Reference implementation

CVP Studio 0.1 includes:

- resumable browser uploads
- SHA-256 source fingerprints
- ffprobe technical metadata extraction
- thumbnail generation
- atomic JSON metadata persistence
- encrypted platform tokens
- YouTube OAuth flow
- live adapter implementations for YouTube, Dailymotion, Vimeo and PeerTube
- canonical website adapter
- safe deterministic mock adapters
- background analysis, publishing and analytics synchronization
- a public interactive demo

## Security notes

CVP Studio encrypts stored tokens with AES-256-GCM using `APP_ENCRYPTION_KEY`. Production deployments must set a unique secret, terminate TLS, restrict dashboard access and move large assets to appropriate object storage when required.

## Extension points

Future versions may standardize:

- C2PA assertions and provenance
- captions and translated metadata as first-class resources
- comment and moderation event normalization
- revenue settlement statements
- signed creator identities
- webhook delivery
- multipart object-storage uploads
- federated discovery
