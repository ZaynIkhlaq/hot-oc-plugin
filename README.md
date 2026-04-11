# HOT — High On Tokens

OpenCode plugin that lets you use GitHub Copilot from another account. When your quota runs out, it automatically rotates to the next account. 

---

## How it works

You generate a Copilot-scoped token from any GitHub account that has Copilot active. HOT injects that token into every OpenCode request instead of your own credentials. Add multiple accounts and it rotates between them on failure.

---

## Requirements

- [OpenCode](https://opencode.ai) installed
- Node.js 18+
- At least one GitHub account with Copilot enabled (Student Pack works)

---

## Setup

**1. Clone and build**

```bash
git clone https://github.com/ZaynIkhlaq/hot-plugin
cd hot-plugin
npm install
npm run build
```

**2. Get a Copilot token from the target account**

Run this (on any machine, logged into the target GitHub account in browser):

```bash
curl -s -X POST "https://github.com/login/device/code" -H "Accept: application/json" -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode "client_id=Iv1.b507a08c87ecfe98" --data-urlencode "scope=read:user"
```

You'll get back something like:
```json
{"device_code":"...","user_code":"XXXX-XXXX","verification_uri":"https://github.com/login/device",...}
```

Go to **https://github.com/login/device**, log in as the target account, enter the `user_code`.

Then poll for the token:
```bash
curl -s -X POST "https://github.com/login/oauth/access_token" -H "Accept: application/json" -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode "client_id=Iv1.b507a08c87ecfe98" --data-urlencode "device_code=YOUR_DEVICE_CODE" --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:device_code"
```

You'll get a `ghu_*` token. That's what you need.

**3. Add the account**

```bash
npm run setup
```

It'll ask for:
- A nickname for the account (e.g. `friend1`)
- The `ghu_*` token
- A rotation threshold (how many requests before switching — enter `0` to only rotate on failure)

Repeat for each account you want to add.

Config is saved to `~/.config/opencode/hot.json` with `chmod 600`.

**4. Enable the plugin in OpenCode**

Add this to `~/.config/opencode/opencode.json` (create it if it doesn't exist):

```json
{
  "plugin": ["file:///absolute/path/to/hot-plugin/dist/index.js"]
}
```

**5. Restart OpenCode**

You'll see this in the logs on startup:
```
[HOT] Ready — 2 account(s), active: friend1
```

Every Copilot request now uses the token you configured. When an account fails or hits its threshold, it silently rotates to the next one and logs:
```
[HOT] friend1 → friend2 (auth failure)
```

---

## Adding more accounts

Just re-run setup:
```bash
npm run setup
```

It'll show existing accounts and let you add more. Rotation is round-robin.

---

## Notes

- Tokens are stored in plain text at `~/.config/opencode/hot.json` (owner-read-only, same as `gh` CLI)
- The `ghu_*` token is long-lived but the internal Copilot bearer token it generates expires every 30 minutes — HOT handles refresh automatically
- Student Plan Copilot (`free_educational_quota`) works fine
- You need to redo the device flow if the `ghu_*` token gets revoked

---

## Credits

- [Ahsan Riaz](https://github.com/AhsanRiaz786)
- [Muhammad Faizan Anwar](https://github.com/m-faizananwar) 
 
---

## License

MIT

## Yap

As far as I'm aware, using Opencode with the models provided with the Github Student plan is probably the way to go if you want to use the best models+limits that money *can't* buy. 
There may be better hacks out there (please ping me if you know something better)

