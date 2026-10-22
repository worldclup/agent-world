# Sharing and release checklist

## Required owner decisions

- [ ] Choose a project-wide source license and add `LICENSE`. MIT is one possible choice, not an already granted license.
- [ ] Confirm ownership and redistribution rights for code and every included asset. Preserve third-party notices.
- [ ] Decide repository visibility and approve the public release. These preparation changes do not change GitHub visibility.

## Privacy and safety

- [ ] Inspect tracked files **and all reachable Git history/branches** for credentials, private paths, session logs, personal data, and generated assets with unclear rights.
- [ ] Revoke/rotate any exposed credential before considering history cleanup. Deleting the current file does not remove older commits.
- [ ] Review historical `assets/detailed/` content and branch notes before publishing additional branches/tags.
- [ ] Confirm `.env`, logs, and dependencies are not tracked. `.gitignore` is not a secret scanner.
- [ ] Use DEMO for public screenshots. The local server reads real session folders automatically when available.
- [ ] Keep session continuation opt-in (`OFFICE_SESSION_CHAT=0` in the distributed example); never publish the developer's `.env`.
- [ ] Verify Claude-only support, Codex disabled state, consent, and no automatic retry. Do not use a live personal session for automated release tests.

## Reproducibility

- [ ] In a fresh checkout with Node.js 24 LTS: run `npm ci`, `npm test`, and `npm start`.
- [ ] Open http://localhost:4321 and test DEMO without agent session files.
- [ ] Check all three layouts, four building styles, room hover, movement, and animated backgrounds visually.
- [ ] Add a sanitized screenshot to the README and document known limitations.
- [ ] Follow [CHAT.md](CHAT.md) for an approved manual chat test, including direct startup `.env` loading and disabled-send messages; do not promise live IDE synchronization.

## Publish after approval

- [ ] Commit reviewed changes and push the intended branch.
- [ ] Set the repository public if desired, after the privacy/license checks.
- [ ] Create an approved version tag/release with changes and limitations; align package version if needed.

No release tag, public hosting, npm publication, or GitHub visibility change is performed by this checklist.
