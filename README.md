# Agent World

A local pixel-art office that visualizes Claude Code and Codex session activity. Built with Node.js, native Canvas, and no frontend build step.

## Quick start

Use Node.js 24 LTS and npm. The tests have been run with Node.js 24.14.1.

```sh
git clone https://github.com/worldclup/agent-world.git
cd agent-world
npm ci
npm start
```

Open http://localhost:4321. For development, use `npm run dev` instead; nodemon restarts the server when source files change. Stop it with Ctrl+C. If port 4321 is occupied, stop the other instance first.

Click **DEMO** to generate sample agent activity without needing an active Claude Code or Codex session. Demo activity is synthetic, but the server still monitors local session folders if they exist.

## Features

- Home, medium, and large office layouts.
- Modern, cyber, loft, and garden building styles.
- Animated surroundings, lighting, and elevated trains for medium/large offices.
- Room plaques with hover details, furniture, and agents that move between activity zones.
- Live session events over Server-Sent Events (SSE).

Use the in-app settings to change the office layout and appearance. Browser preferences are stored locally.

## Local data and privacy

The server automatically reads session files under `~/.claude/projects` and `~/.codex/sessions` when present. It streams derived activity, including project/task text, to connected browser clients. Do not use real sessions in public screenshots or recordings without reviewing the visible content.

The server binds to `127.0.0.1:4321`. It has no authentication and is intended for local use, not public hosting. Do not expose it through a tunnel, reverse proxy, or LAN binding without adding authentication and reviewing event data. Google Fonts are loaded over the network; fallback fonts are used when unavailable.

## Development

```sh
npm ci
npm test
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution steps, [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the code map, and [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) before sharing a release.

## License and assets

A project-wide source-code license has **not yet been selected**. Public availability alone does not grant permission to redistribute or commercially reuse the project; ask the owner until a license is added.

Third-party assets have their own terms: see [assets/CREDITS.md](assets/CREDITS.md), [Kenney asset license](assets/License.txt), and [icon license](assets/icons/LICENSE). Preserve those notices when distributing assets. `private: true` in package.json prevents accidental npm publishing; it does not prevent GitHub forks.
