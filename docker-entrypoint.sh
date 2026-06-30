#!/bin/sh
set -eu
mkdir -p "${CVP_DATA_DIR:-/data}/uploads" "${CVP_DATA_DIR:-/data}/thumbs" "${CVP_DATA_DIR:-/data}/manifests"
node --import tsx scripts/seed.ts
exec "$@"
