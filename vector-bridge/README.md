# SWISH Vector Companion

This small, local Node.js bridge turns an already configured WirePod Vector
into a privacy-first SWISH desk companion. It is designed to run on the same
private network as WirePod, normally on the PC being used for SWISH.

It does **not** add a database, change the SWISH schema, create a second
authentication system, or put WirePod control in the browser.

## What it does

- Announces new SWISH orders without speaking buyer names, addresses, item
  titles, prices, or credentials.
- Optionally announces that an inventory item was added.
- Provides an authenticated local `status` command that speaks only aggregate
  inventory, live-listing, and order counts.
- Uses WirePod's behaviour-control/speech/release sequence. It never sends
  wheel, lift, head, camera, or other physical-control commands.

The bridge reads only the explicitly configured `SWISH_TENANT_ID`. Every
request also carries an ordinary signed-in user access token, so existing RLS
policies remain the second line of protection.

## Prerequisites

1. Vector has completed WirePod setup and is visible in WirePod.
2. This computer can open the WirePod address, commonly
   `http://escapepod.local:8080`.
3. Node.js 18 or later is installed.
4. You have a normal SWISH user session with permission for the one workspace
   you want Vector to accompany.

## Configure

1. Copy `.env.example` to `.env` in this `vector-bridge` directory.
2. Fill in the backend URL, the public SWISH anon key, WirePod URL, Vector
   serial, and a long `BRIDGE_SHARED_SECRET`. Leave `SWISH_ACCESS_TOKEN` and
   `SWISH_TENANT_ID` blank for first-time setup.
3. Keep `.env` only on this private computer. It is already ignored by Git.

The normal SWISH web app can supply the two blank values through its deliberate
**Pair this PC** action. It sends the current, ordinary user session and
resolved workspace scope only to the bridge at `127.0.0.1` on the same PC. The
bridge accepts this request only from the configured `SWISH_WEB_ORIGIN` and
never returns either value to the browser.

`SWISH_ACCESS_TOKEN` must be an ordinary user JWT. The bridge rejects a JWT
whose role is `service_role`. Do not give the bridge an eBay secret, a Supabase
service-role key, browser storage dump, customer export, or any other elevated
credential.

## Run

From the repository root:

```sh
npm run vector:bridge
```

The first run listens only on loopback and says it is waiting for a deliberate
browser pairing. In the signed-in SWISH web app, go to **Settings → Vector**
and choose **Pair this PC**. Only do this on the computer running the bridge.
Your browser may ask whether `swishflip.co.uk` can reach its local companion
service; approve that permission only after confirming you started this bridge
yourself.

After pairing, the bridge verifies WirePod, stores the explicitly scoped
session locally in the ignored `.env`, and begins its normal polling cycle.
On its first successful cycle, the bridge stores a local cursor and remains
quiet. It announces only rows created after that point. Stop it with
`Ctrl+C`.

To check the robot path before leaving it running, use the local command
endpoint from the same PC:

```sh
curl -X POST http://127.0.0.1:8788/v1/command \
  -H "Authorization: Bearer YOUR_BRIDGE_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"command":"test"}'
```

Use `{"command":"status"}` to have Vector say aggregate SWISH counts.
Set a long `BRIDGE_SHARED_SECRET` before calling the endpoint. The default
binding is loopback-only; keep it that way unless you specifically need a
trusted LAN service to call it.

## WirePod Custom Intent on this Windows PC

When WirePod is installed on the same Windows PC as this bridge, it can invoke
the local `status` endpoint without exposing it to the LAN.

1. Set `BRIDGE_BIND_HOST=127.0.0.1` and a random `BRIDGE_SHARED_SECRET` of at
   least 32 characters in `.env`.
2. Start the bridge with `npm run vector:bridge` and leave that process running.
3. Test the local handoff from PowerShell (it does not print your secret):

   ```powershell
   powershell.exe -NoProfile -File .\vector-bridge\scripts\wirepod-swish.ps1 -Command test
   ```

4. In WirePod, open **Custom Intents** and choose **Add a custom intent**.
   Use these safe speech fields:

   - Name: `SWISH Status`
   - Description: `Speak aggregate SWISH workspace status`
   - Intent: `intent_greeting_hello`
   - Utterances: `swish status`, `check swish`, `how is swish doing`

5. For the execution program and arguments, use the script at
   `vector-bridge/scripts/wirepod-swish.ps1` with the `status` argument. The
   exact labels and argument layout vary by WirePod version, so check the
   fields shown by your installed page before saving. Do not place the
   `BRIDGE_SHARED_SECRET` in the intent form: the script reads it only from the
   ignored local `.env` file.

The script calls only `http://127.0.0.1:<BRIDGE_PORT>/v1/command`, presents its
bridge secret as a local request header, and accepts only the `status` or `test`
command. It does not run arbitrary text passed from Vector.

## Security boundaries

- The hosted SwishWeb page makes one deliberate, user-triggered request only to
  `http://127.0.0.1:<BRIDGE_PORT>/v1/pair`. It never calls WirePod directly
  and cannot issue robot-control commands.
- Pairing is available only when the bridge binds to loopback. The local server
  allows the one configured HTTPS SWISH origin, responds to standard CORS and
  local-network preflights, and returns no session or tenant values.
- Only fixed, privacy-safe phrases are generated for alerts. The bridge does
  not read buyer names, addresses, titles, prices, or messages.
- All SWISH reads include `tenant_id=eq.<SWISH_TENANT_ID>` and use the user's
  normal RLS-scoped bearer token. There is no service role, cross-tenant query,
  or schema change.
- The bridge's optional incoming command endpoint only accepts `test` and
  `status`, and requires a matching bearer secret. It returns no SWISH record
  data.
- This first version deliberately excludes movement and camera controls.

## Known limitation

WirePod custom intents/voice-provider configuration varies by installation.
The bridge includes a Windows same-PC handoff script, but it does not alter
WirePod's voice configuration automatically. Review the exact Custom Intent
fields shown by your installed WirePod version before saving it.

