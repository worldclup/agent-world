# Contributing

Before redistributing a fork, confirm the source-code license with the owner; a project-wide license is still pending.

1. Fork the repository and clone your fork.
2. Install Node.js 24 LTS, then run `npm ci`.
3. Create a branch: `git switch -c feat/your-change`.
4. Make one focused change and update relevant tests/documentation.
5. Run `npm test` and `git diff --check`.
6. Run `npm run dev`, open http://localhost:4321, and check the affected layouts and themes. Use DEMO instead of sharing real session data.
7. Commit, push to your fork, and open a pull request describing the change, tests, and remaining limitations. Include sanitized screenshots for visual changes.

Keep the native Canvas approach and existing helpers where possible. Avoid dependencies for small drawing/layout changes. Keep room entrances, activity destinations, and agent paths reachable.

For bug reports, include Node/browser/OS versions, reproduction steps, expected vs actual behavior, and sanitized screenshots. Never upload session logs, API keys, or private project/task text. For a suspected security issue, do not publish exploit details or secrets in a public issue; contact the maintainer privately first.
