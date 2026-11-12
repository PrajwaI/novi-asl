# Novi ASL

A vanilla HTML/CSS/JavaScript fingerspelling site with alphabet lessons, knowledge checks, private camera recognition, word studio, and Nori, an original firefly learning companion. No production dependencies or build step are required.

## Run locally

Use **Node 22.9+** (tested with 24.18.0) and open Magnitude on this computer.

1. Verify your installed version, address and exact model ID. In PowerShell, if `magnitude` is not on PATH:

   ```powershell
   $magnitudeCli = "$env:LOCALAPPDATA\Programs\Magnitude CLI\magnitude.exe"
   & $magnitudeCli --version
   & $magnitudeCli status
   & $magnitudeCli models status
   & $magnitudeCli docs remote-access
   ```

2. Check the API using the address printed by your installation:

   ```powershell
   Invoke-RestMethod http://127.0.0.1:10100/inference/v1/models |
     Select-Object -ExpandProperty data | Select-Object id
   ```

3. Load the **exact returned ID**. On this installation:

   ```powershell
   & $magnitudeCli models load 'lfm3-1.7b:gguf:q4-qat'
   & $magnitudeCli models status 'lfm3-1.7b:gguf:q4-qat'
   ```

   A downloaded/listed model can still be unloaded. Magnitude can load it on first inference, with extra delay. Confirm readiness or inspect load errors; do not infer readiness from the download badge.

4. From this repository, create a configuration if you do not already have one:

   ```powershell
   Copy-Item .env.example .env
   npm start
   ```

   Open **http://localhost:8000**. `npm start` loads `.env`; plain `node server.js` requires variables in its environment. `.env` is ignored by Git and never served. `npm install` is only necessary for development tests.

5. Open **Ask Nori** on either page. Check backend connectivity separately:

   ```powershell
   Invoke-RestMethod http://localhost:8000/api/nori/status
   ```

   This checks connectivity, authentication and exact model availability. It does **not** claim the model is loaded or perform inference. Send a message to verify inference.

## Verified Magnitude installation

Verified November 12, 2026, with the installed CLI, bundled `remote-access` documentation and real HTTP requests:

| Item | Verified value |
| --- | --- |
| Version | `0.2.17` |
| Service address | `127.0.0.1:10100` |
| OpenAI-compatible root | `http://127.0.0.1:10100/inference/v1` |
| Exact model ID | `lfm3-1.7b:gguf:q4-qat` |
| Display name | Liquid LFM3 1.7B (Q4 QAT) |
| Local authentication | `/models` and chat succeeded without a key over loopback |
| Streaming | `stream: true` returned SSE answer deltas and `[DONE]` |
| Reasoning | `reasoning_effort: "none"` returned answer text without reasoning deltas |
| Readiness | Initially unloaded; the first inference request successfully loaded it |

Recheck after upgrades or moving machines. [Magnitude’s remote-server documentation](https://docs.magnitude.dev/remote-server) describes network access, which uses the server’s **network access key**. The verified loopback installation needed no key. Do not substitute the display name for the API ID.

Optional direct streaming check in PowerShell (use your verified address/ID):

```powershell
'{"model":"lfm3-1.7b:gguf:q4-qat","messages":[{"role":"user","content":"Say hello briefly."}],"reasoning_effort":"none","max_tokens":40,"stream":true}' |
  curl.exe -N http://127.0.0.1:10100/inference/v1/chat/completions -H 'Content-Type: application/json' --data-binary '@-'
```

For remote inference, add `-H "Authorization: Bearer $env:MAGNITUDE_API_KEY"` and verify authentication with that server’s installed documentation. Keep actual keys out of tracked files.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MAGNITUDE_BASE_URL` | Verified API root including `/inference/v1`, without `/chat/completions`. Default: `http://127.0.0.1:10100/inference/v1`. |
| `MAGNITUDE_MODEL` | Required exact installed ID; `.env.example` contains the verified local ID. Checked against `/models` before chat. |
| `MAGNITUDE_API_KEY` | Optional locally; required if your inference server requires network authentication. Forwarded as Bearer authentication, server-side only. |
| `MAGNITUDE_STREAM` | `true` for verified SSE; `false` for a verified server requiring JSON completions. Browser transport is NDJSON in either mode. |
| `MAGNITUDE_REASONING_EFFORT` | `none` for the verified model, avoiding hidden reasoning consuming the answer budget. Verify support if changing models. |
| `MAGNITUDE_TIMEOUT_MS` | Total model-list/inference timeout, default `240000`; clamped between 1 second and 10 minutes. |
| `PORT` | Novi port, default `8000`. |
| `HOST` | Bind interface, default `127.0.0.1`; configure appropriately behind a production proxy. |

The proxy accepts bounded text-only user/assistant messages, reconstructs lessons from `lessons.js`, allowlists context, and strips reasoning/tool-call deltas. It runs one inference at a time per process, aborts on disconnect, supports timeout/cancellation and returns useful errors. It never logs chats or persists them on the Node server. Logging by your configured inference host is controlled there.

## Companion and progress

- `dist/js/nori.js`, `dist/nori.css`, `dist/assets/nori.svg`: shared chat and mobile bottom sheet, original teal/mint/peach firefly with idle/thinking/happy/resting expressions, reduced motion, native dialog focus/keyboard handling, cancellation, retry and plain-text rendering. Mascot movements are decorative, never ASL signs.
- `dist/js/nori-context.js`: explicit state adapter and throttled events. Sends page/route, selected letter, relevant lesson, progress summary, word position/completion and text camera status/feedback. Camera updates never trigger inference. **Frames, video, photos and landmarks are never sent.**
- `novi.academy.v1`, with `signly.academy.v1` fallback: selected letter, manually studied letters and lifetime `quizCorrect`. New `quizAttempts`, `trackedQuizCorrect` and bounded `quizHistory` record future answers only. Older correct answers have no accuracy denominator.
- `signly.progress.v1`: existing camera completions, correct/total recorded attempts, activity days/daily counts and recent history. Uncertain frames are unscored. Manual and camera evidence stay separate; only the combined studied total deduplicates overlap.
- `novi.nori.v1`: separate versioned chat/settings storage, up to 24 persisted messages across both pages. At most four recent messages within a 2,400-character conversation budget reach the model; incomplete and built-in messages are excluded. Two-step **Delete conversation** leaves learning progress unchanged. Blocked storage falls back to memory for the current page session; it cannot persist across navigation.
- First-use/word-completion tips are dismissible and never open chat. Disable them under **Built-in help & settings**. Built-in lesson/navigation/camera/progress help works without Magnitude or a backend, labeled **Built-in guide**. Navigation uses known routes and validated letters, only when selected. AI output cannot execute actions, award completions or change recognition thresholds.

Camera recognition is experimental. Nori cannot see or verify your hand; it explains text feedback with uncertainty. **J and Z are movement lessons with automatic grading disabled; word studio excludes both.** ASL is a complete language; fingerspelling is one part. Learn with Deaf ASL educators beyond this alphabet material.

## Troubleshooting

- **Port busy / API returns 404:** an older static Novi server may still be running. Stop it in its terminal and restart with `npm start`, or set `$env:PORT='8001'` and open that port. Running Node processes do not reload backend changes.
- **Static host / missing backend:** use built-in help or run the included Node server for AI chat.
- **Cannot connect:** keep Magnitude open, check `status`, the API root and inventory; inspect `%USERPROFILE%\.magnitude\logs\inference.log`. Downloaded does not mean loaded.
- **401/403 from Magnitude:** set its network access key in backend `MAGNITUDE_API_KEY`. **421:** use its verified IP or configure allowed hosts.
- **Slow first reply:** the model may be loading/processing context. The first full companion request here took about **40 seconds**. Nori shows a waiting state; Stop cancels upstream work. Keep questions short; built-in help is immediate.
- **Empty/truncated answer:** verify `MAGNITUDE_REASONING_EFFORT=none` for this model, then ask a shorter question. Answers are capped at 220 tokens. Partial text is marked incomplete and excluded from later model context.
- **Busy:** wait for or stop the current inference, then retry. The panel also blocks duplicate submissions.
- **Camera blocked/busy/missing:** use HTTPS or localhost, allow camera access in browser site settings, reconnect it or close other camera apps. Recognition is independent of Magnitude.
- **Progress/chat missing:** storage belongs to a browser profile and origin, including hostname **and port**. `localhost`, `127.0.0.1`, other ports and published sites have separate records. Private/blocked storage can prevent persistence.

## Deployment

Uploading `dist/` to a static host still serves lessons, knowledge checks, camera recognition and built-in help. **Static deployment cannot run `server.js` or the AI proxy.**

For AI chat, deploy Node and `dist/` together behind HTTPS, routing `/api/nori/*` to this backend on the **same origin**. Disable proxy buffering for chat, allow the inference timeout and keep credentials in backend environment variables. Cross-origin chat is rejected.

The backend must itself reach Magnitude. A public website’s `localhost` refers to its hosting machine or visitor’s machine, **not the developer’s computer**. Use co-located inference or a reachable private server/tunnel and its required key. Static hosting cannot access your desktop model. For shared/public deployment, add authentication, per-user rate limits and capacity controls at the hosting gateway; the included one-request limit protects a single local process. Camera use outside localhost also requires HTTPS.

## Verification

```powershell
npm install
npm test
npm run test:browser
```

Browser tests use installed Microsoft Edge headlessly, start/reuse port 8001 and save screenshots under ignored `test-results/`. Install Edge or change the Playwright channel on other platforms.

Coverage includes canonical lessons and privacy filtering, SSE/JSON/UTF-8 transport, reasoning exclusion, upstream errors, malformed/cross-origin requests, timeout/concurrency/cancellation, legacy/accurate progress, unchanged recognition gates, both pages’ context/continuity/deletion, HTML-like model output, retry, camera permission errors, valid/invalid words, repeated-letter completion, mobile layouts, reduced motion, disabled tips, focus/Escape and blocked storage. Completion tests feed **simulated classifier callbacks** through existing recognition gates and saved progress; they do not measure physical webcam accuracy.

Real Magnitude checks verified model listing, keyless loopback, loading, SSE, disabled reasoning and a full lesson reply through the Node proxy. Physical hand recognition, real-world model accuracy and public hosting/tunnel configuration require verification in their intended environments.
