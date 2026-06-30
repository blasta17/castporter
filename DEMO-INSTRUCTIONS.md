# CVP Studio Demo Instructions

## Purpose

The public demo proves that a non-technical creator can use CVP without a CLI.

## Run

1. Start the Docker stack.
2. Open `http://localhost:3080/demo`.
3. Drop a short local video into the page.
4. Enter a title and optional description.
5. Keep all five destinations selected.
6. Confirm rights and visibility.
7. Select **Run CVP demo**.

The browser uploads the actual file in resumable chunks. The background worker then:

1. calculates the source fingerprint;
2. extracts duration, codecs and resolution;
3. creates a thumbnail;
4. creates the canonical CVP identity and manifest;
5. publishes through deterministic mock adapters;
6. generates platform receipts;
7. synchronizes demo analytics.

No platform account is needed and the file remains in the local Docker volume.

## Full studio workflow

Open `http://localhost:3080/studio/publish` to use the product workflow. Uploaded videos appear in the library, and each video receives a workspace with a player, platform statuses, receipts, metadata editor, manifest and audit timeline.
