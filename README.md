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

Settings also include English / ไทย. English is the default; the selected language is remembered in this browser. Cancel restores the language from when settings were opened. Interface labels, room hover details, and generated status summaries are localized; project names and real agent messages remain unchanged.

## Experimental session continuation

The sidebar lists real sessions currently represented by office agents, identified by provider, project and short display ID. DEMO and unconnected residents are excluded. Full session IDs and project directories are resolved server-side from local metadata, never accepted from the browser. Ambiguous IDs cannot be resumed.

**Prototype support:** Claude can be resumed using the installed Claude Code CLI, with tools, MCP servers, skills, and hooks disabled by launch flags. Codex sessions are visible but sending is disabled until a separate adapter with adequate permission controls is implemented. There is no fallback to a new API conversation and no standalone Chat AI actor.

1. Install and sign in to Claude Code independently. Make sure `claude` is on the server's PATH (or configure an absolute `CLAUDE_BIN`).
2. Copy `.env.example` to `.env` locally and explicitly set `OFFICE_SESSION_CHAT=1`.
3. Restart with `npm start` or `npm run dev` (Node.js 24). Open `http://localhost:4321` or `http://127.0.0.1:4321` directly.
4. Select the real session after it has finished its IDE turn. Stop using that session in the IDE, tick the confirmation, then send.

Sending appends a real turn to the selected session through `claude --resume`, using the CLI's signed-in account and provider context. Account usage/billing applies. Automated tests use mocked subprocesses. A user has reported successful Claude replies, including after retrying an extension session, but compatibility with every IDE session is not established. Session history may contain private context. The IDE may need reopening or resuming to show the new turn; live synchronization with its existing panel is not guaranteed.

The server loads the project-root `.env` on startup, including when launched with `node server.js`. Development mode also watches `.env`; otherwise restart after editing it. Existing process environment variables take precedence. For setup, disabled-send troubleshooting, and safe retry guidance, see [Session chat guide](docs/CHAT.md).

The server rejects sessions whose latest observed state is not idle, and allows only one web continuation process at a time. Log-derived state cannot detect every concurrent IDE turn; **never use the same session simultaneously in both places**. Requests are limited to 4,000 characters, a 120-second timeout and 1 MiB of CLI output. No retries are automatic: a timeout/failure may still have recorded the message. Check the original session before resending.

Clear view only clears this tab's displayed messages, not the original session history. Existing history is not loaded into the browser. This is local-only experimental software, not suitable for public hosting. See the [Claude CLI guide](https://code.claude.com/docs/en/headless) and [Codex continuation protocol](https://learn.chatgpt.com/docs/app-server).

## Local session data and privacy

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
