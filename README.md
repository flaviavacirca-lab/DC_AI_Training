# Denneen & Company — AI Learning Hub

Internal training site for Denneen employees to learn and practice Microsoft Copilot usage in client work.

## Hosting

Static site on **GitHub Pages** — no backend or build step required.

**URL:** `https://flaviavacirca-lab.github.io/DC_AI_Training/`

## Authentication

The site uses **Microsoft Entra ID** (Azure AD) for authentication via MSAL.js v2 with Authorization Code Flow + PKCE. Only users with a real Denneen Microsoft work account can access any content.

### How It Works

1. Unauthenticated visitors are redirected to `index.html` (login page)
2. Clicking "Sign in with Microsoft" triggers MSAL redirect login
3. Microsoft authenticates the user and redirects to `auth-callback.html`
4. The callback page validates the user's identity:
   - **Tenant ID** (`tid` claim) must match the Denneen tenant
   - **Email/UPN** must end with `@denneen.com`
5. If validation fails, the user is signed out and shown an error
6. If validation passes, the user is redirected to their intended page

### Entra ID App Registration Setup

To enable authentication, you must register an application in Microsoft Entra ID (Azure AD):

#### Step 1: Create the App Registration

1. Go to the [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. **Name:** `Denneen AI Learning Hub`
3. **Supported account types:** Select **"Accounts in this organizational directory only (Denneen & Company only — Single tenant)"**
4. **Redirect URI:**
   - Platform: **Single-page application (SPA)**
   - URI: `https://flaviavacirca-lab.github.io/DC_AI_Training/auth-callback.html`
5. Click **Register**

#### Step 2: Note the IDs

After registration, copy these values from the **Overview** page:

| Value | Where to find it | Placeholder in code |
|-------|-------------------|---------------------|
| **Application (client) ID** | Overview → Application (client) ID | `<CLIENT_ID>` |
| **Directory (tenant) ID** | Overview → Directory (tenant) ID | `<TENANT_ID>` |

#### Step 3: Configure the App

1. Go to **Authentication** in the left menu
2. Under **Single-page application** → **Redirect URIs**, verify:
   - `https://flaviavacirca-lab.github.io/DC_AI_Training/auth-callback.html`
3. Under **Front-channel logout URL**, add:
   - `https://flaviavacirca-lab.github.io/DC_AI_Training/index.html`
4. Under **Implicit grant and hybrid flows**, ensure both checkboxes are **unchecked** (we use Authorization Code + PKCE, not implicit)
5. Click **Save**

#### Step 4: (Optional) Add localhost for development

If you want to test locally, add an additional redirect URI:
- `http://localhost:8080/auth-callback.html` (or whatever port you use)

Both redirect URIs can be registered simultaneously.

#### Step 5: Update the code

Open `js/auth.js` and replace the placeholders at the top:

```javascript
var TENANT_ID = '<TENANT_ID>';   // e.g., 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
var CLIENT_ID = '<CLIENT_ID>';   // e.g., '12345678-abcd-ef01-2345-6789abcdef01'
```

#### Important Notes

- **No client secret is needed.** This is a public SPA client — PKCE handles security.
- **Do not** enable implicit grant flows. The app uses Authorization Code + PKCE which is more secure.
- **Single-tenant only.** The authority URL is `https://login.microsoftonline.com/<TENANT_ID>`, not `/common`.
- The app requests these scopes: `openid`, `profile`, `email` — no additional API permissions are needed for basic authentication.

## Local Development

Serve the site with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve -l 8080
```

Then visit `http://localhost:8080/index.html`.

Make sure to register `http://localhost:8080/auth-callback.html` as a redirect URI in your Entra App Registration (see Step 4 above).

## Project Structure

```
├── index.html                  # Login page (Microsoft sign-in)
├── auth-callback.html          # MSAL redirect callback handler
├── account.html                # User dashboard (progress, saved prompts)
├── suggested-training-flow.html
├── training-library.html
├── copilot-101.html            # Copilot 101: The Basics
├── copilot-102.html            # Copilot 102: Using Agents
├── prompt-training.html        # Prompt Engineering training
├── prompt-library.html         # Prompt Library
├── live-trainings.html         # Live trainings schedule
├── resources.html              # External resources
├── js/
│   ├── auth.js                 # MSAL authentication module
│   ├── progress.js             # Progress tracking & saved prompts
│   ├── app.js                  # UI interactions (nav, forms, account)
│   └── prompt-coach.js         # CRAFT prompt analysis widget
├── css/
│   └── styles.css              # All styles
└── README.md
```

## Data Storage

All user data is stored in the browser's `localStorage`, keyed by the authenticated user's UPN:

- `dc_ai_training::<user_upn>::progress` — module completion, practice scores, submissions
- `dc_ai_training::<user_upn>::saved_prompts` — saved prompt library items
