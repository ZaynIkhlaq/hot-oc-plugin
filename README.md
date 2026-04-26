# HOT — High On Tokens

OpenCode plugin that lets you use GitHub Copilot through any account. Add multiple accounts and switch between them directly from the chat.

---

## Requirements

- [OpenCode](https://opencode.ai) installed
- Node.js 18+
- At least one GitHub account with Copilot enabled (Student Pack works)

---

## Setup

**1. Install the plugin**

```bash
npx hot-oc-plugin
```

This installs the plugin globally and registers it with OpenCode automatically.

**2. Restart OpenCode**

**3. Add your first account**

Inside OpenCode, just say:

> "Add a Copilot account"

The plugin will open GitHub in your browser and show you a code to enter. Log in as the GitHub account you want to add, enter the code, and authorize it. Once done, tell OpenCode you're finished and it'll save the account automatically.
That's it.

---

## Managing accounts

Everything is done through chat — just ask naturally:

| What you say | What happens |
|---|---|
| "Add a Copilot account" | Start adding a new account |
| "Switch to friend1" | Switch the active account |
| "Which account am I using?" | See all accounts and which is active |
| "Rename account 2 to work" | Rename an account |
| "Check my accounts" | Validate every token, flag any that are revoked |
| "Remove account 2" | Remove an account |

---

## Notes

- Tokens are stored at `~/.config/opencode/hot.json` (owner-read-only)
- The GitHub token is long-lived but the internal Copilot bearer token it generates expires every 30 minutes — OpenCode handles the refresh automatically
- Student Plan Copilot works fine
- If a token gets revoked, "check my accounts" will surface it — then remove and re-add

---

## Credits

- [Samama Usman](https://github.com/Samama251251) for lending me your account.
- [Faizan Anwar](https://github.com/m-faizananwar) for debugging with me at 2 am.

---

## License

MIT
