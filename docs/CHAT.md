# Session chat

Continue a real session represented by an office agent. This is not a separate API chatbot and does not mirror the IDE's open chat panel live.

## Support

| Session | List in picker | Send from web |
| --- | --- | --- |
| Claude with valid local metadata | Yes, while represented by an active office agent | Experimental; only when idle and explicitly confirmed |
| Codex with valid local metadata | Yes | Not implemented; Send stays disabled |
| DEMO / resident without a real session | No | No |

Claude is resumed through the installed CLI with tools, MCP servers, skills and hooks disabled by launch flags. It uses the CLI's existing signed-in account, not `OPENAI_API_KEY`. Provider usage limits and billing apply. Full session IDs and project paths come from server-side metadata; shortened display IDs are never used directly as resume IDs. Collisions are rejected.

## Enable and use

1. Install and sign in to Claude Code. Ensure `claude` is on the server's PATH, or set `CLAUDE_BIN` to its absolute executable path.
2. Create `.env` in the project root (use `.env.example` as a template):

   ```env
   OFFICE_SESSION_CHAT=1
   ```

3. Start with `npm run dev` or `npm start`. `server.js` loads that project-local file even when started directly. Development mode restarts on `.env` edits; manually restart other launches. Existing shell environment values take precedence over `.env`.
4. Open http://localhost:4321 or http://127.0.0.1:4321 directly and wait for real session activity. Recent sessions expire from the list after 15 minutes without observed activity.
5. Select Claude, the intended project and session. Wait until it is Resting, and stop using that same session in the IDE.
6. Tick the confirmation and Send. Confirmation resets after each request. The full reply appears when the CLI finishes; there is no token streaming yet.

Messages append to real provider session history. **Clear view** only clears this browser tab's display, not the source session. Existing conversation history is not loaded into the web transcript. Your messages are blue/right-indented; Claude replies are orange/left-indented.

## Send is disabled

Read the status below the buttons:

- **Set OFFICE_SESSION_CHAT=1…**: the running server has chat disabled. Check the root `.env`, restart the correct server instance, and reload the page. A visible session alone does not mean continuation is enabled.
- **Codex continuation is not enabled…**: intentional prototype limitation, not a credentials issue.
- **Session appears busy…**: wait for the IDE turn to end. The check uses observed logs, not an exclusive lock shared with the IDE.
- **Choose a visible session**: wait for activity or choose another real session. Missing/invalid metadata and display-ID collisions cannot be resumed.
- If the status is ready, tick the confirmation and enter a message. Do not use both the IDE and web to send into the same session concurrently.

You can inspect only the effective enable flag from a terminal without printing session content or credentials:

```sh
node -e 'fetch("http://127.0.0.1:4321/sessions").then(r=>r.json()).then(d=>console.log({enabled:d.enabled}))'
```

## A request fails after sending

- **CLI could not start**: check the executable path and whether the recorded project directory still exists.
- **Continuation failed / no confirmed reply**: the process may have failed, or its JSON result/session ID did not pass validation. This generic message does not prove that VS Code extension sessions are unsupported.
- **Timeout**: a request is stopped after 120 seconds. A failed or timed-out request may already have appended its message. Check the original session **before resending**. The app does not retry automatically.

Automated tests cover mocked CLI behavior, validation and session-ID resolution. Successful live Claude replies have been reported by the user, but reliable continuation and immediate IDE refresh across all extension versions are not guaranteed.

## Limits and safety

- Local access only; no public hosting or tunnels. Host/origin checks are not a replacement for authentication.
- One web continuation process at a time, 4,000 characters per message, and 1 MiB of CLI output.
- Never submit secrets or publish raw session logs, `.env`, or screenshots containing private tasks.
- Resuming consumes provider resources and modifies session history even though model tools are disabled.
