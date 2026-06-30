# Build fix 0.1.1

This release removes internal package-registry URLs accidentally embedded in `package-lock.json`.

Changes:

- All dependency tarballs now resolve from `https://registry.npmjs.org/`.
- Added a project `.npmrc` that explicitly selects the public npm registry.
- Docker images now use Node.js 20 Bookworm Slim for a more conservative LTS build environment.
- `npm ci` disables audit and funding network calls during image builds.
