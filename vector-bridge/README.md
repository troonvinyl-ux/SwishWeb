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
2. Fill in the backend URL, the public SWISH anon key, your ordinary **user**
   access token, the exact tenant ID, WirePod URL, and Vector serial.
3. Keep `.env` only on this private computer. It is already ignored by Git.

`SWISH_ACCESS_TOKEN` must be an ordinary user JWT. The bridge rejects a JWT
whose role is `service_role`. Do not give the bridge an eBay secret, a Supabase
service-role key, browser storage dump, customer export, or any other elevated
credential.

## Run

From the repository root:

```sh
npm run vector:bridge
```

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

## Security boundaries

- The hosted SwishWeb page never calls `escapepod.local` directly. That avoids
  mixed-content/CORS failures and prevents a browser session from controlling a
  robot on the local network.
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
The bridge is ready to speak a `status` response when a trusted local intent
forwards that command, but it does not change WirePod's voice configuration for
you. That configuration should be made only after confirming the exact
WirePod version and local-network address.
