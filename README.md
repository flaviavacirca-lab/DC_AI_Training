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

## Azure Function Backend (Prompt Coach AI)

The Prompt Coach "AI Improve" feature uses an Azure Function backend that proxies requests to Azure OpenAI. The backend validates Entra tokens so no API keys are exposed to the browser.

### Architecture

```
Browser  →  MSAL acquireToken()  →  Bearer token
         →  POST /api/prompt-coach  →  Azure Function
                                        ├── Validate JWT (Entra JWKS)
                                        └── Call Azure OpenAI
                                        └── Return structured JSON
```

### Step 1: Create a second App Registration for the API

1. Go to **Azure Portal** → **Microsoft Entra ID** → **App registrations** → **New registration**
2. **Name:** `Denneen AI Hub API`
3. **Supported account types:** Single tenant (Denneen only)
4. Click **Register**
5. Copy the **Application (client) ID** — this is `<API_CLIENT_ID>`

### Step 2: Expose an API scope

1. In the new API app registration, go to **Expose an API**
2. Click **Set** next to Application ID URI → accept the default `api://<API_CLIENT_ID>`
3. Click **Add a scope**:
   - Scope name: `access_as_user`
   - Who can consent: **Admins and users**
   - Admin consent display name: `Access AI Learning Hub API`
   - Admin consent description: `Allow the AI Learning Hub to call the API on behalf of the user`
4. Click **Add scope**

### Step 3: Grant the SPA permission to call the API

1. Go back to the **SPA app registration** (Denneen AI Learning Hub)
2. Go to **API permissions** → **Add a permission** → **My APIs**
3. Select `Denneen AI Hub API` → check `access_as_user` → **Add permissions**
4. Click **Grant admin consent for Denneen & Company**

### Step 4: Deploy the Azure Function

```bash
cd azure-functions/dc-ai-hub

# Install dependencies
npm install

# Create the Function App in Azure
az functionapp create \
  --resource-group <RESOURCE_GROUP> \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name dc-ai-hub-api \
  --storage-account <STORAGE_ACCOUNT>

# Set environment variables
az functionapp config appsettings set \
  --name dc-ai-hub-api \
  --resource-group <RESOURCE_GROUP> \
  --settings \
    TENANT_ID="<TENANT_ID>" \
    API_CLIENT_ID="<API_CLIENT_ID>" \
    AZURE_OPENAI_ENDPOINT="https://<resource>.openai.azure.com" \
    AZURE_OPENAI_API_KEY="<key>" \
    AZURE_OPENAI_DEPLOYMENT="<deployment-name>" \
    AZURE_OPENAI_API_VERSION="2024-02-01" \
    ALLOWED_ORIGIN="https://flaviavacirca-lab.github.io"

# Deploy
func azure functionapp publish dc-ai-hub-api
```

### Step 5: Configure CORS in Azure Portal

1. Go to the Function App → **CORS**
2. Add: `https://flaviavacirca-lab.github.io`
3. Save

### Step 6: Update the frontend code

Open `js/promptCoachAgent.js` and replace the placeholders:

```javascript
var API_URL = 'https://dc-ai-hub-api.azurewebsites.net/api/prompt-coach';
var API_SCOPE = 'api://<API_CLIENT_ID>/access_as_user';
```

### Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `TENANT_ID` | Denneen Microsoft Entra tenant ID |
| `API_CLIENT_ID` | Application (client) ID of the API app registration |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint URL |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT` | Chat model deployment name (e.g., `gpt-4o`) |
| `AZURE_OPENAI_API_VERSION` | API version (default: `2024-02-01`) |
| `ALLOWED_ORIGIN` | Comma-separated allowed CORS origins |
| `STORAGE_CONNECTION_STRING` | Azure Storage connection string (for Table Storage) |
| `TELEMETRY_TABLE_NAME` | Table name for telemetry events (default: `telemetry`) |
| `COMPLETIONS_TABLE_NAME` | Table name for module completions (default: `completions`) |
| `ADMIN_EMAILS` | Comma-separated admin emails (e.g., `flavia.vacirca@denneen.com`) |

## Analytics & Admin Dashboard

The site tracks usage telemetry (page views, module completions, prompt coach usage) and provides an admin-only dashboard at `/admin.html`.

### Backend Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/telemetry` | POST | Record usage events (page_view, module_open, module_complete, prompt_coach_used) |
| `/api/user/progress` | GET | Get completions for the authenticated user |
| `/api/admin/check` | GET | Check if the current user is an admin |
| `/api/admin/summary` | GET | Admin-only: 30-day usage summary with per-user detail |

### Admin Access

Admin access is controlled by the `ADMIN_EMAILS` environment variable. Set this to a comma-separated list of email addresses. Non-admins who visit `/admin.html` are redirected to their account page.

### Storage

Telemetry and completion data is stored in **Azure Table Storage**. Create a Storage Account in Azure and set the `STORAGE_CONNECTION_STRING` environment variable. The tables are created automatically on first write.

## Project Structure

```
├── index.html                  # Login page (Microsoft sign-in)
├── auth-callback.html          # MSAL redirect callback handler
├── account.html                # User dashboard (progress, saved prompts)
├── admin.html                  # Admin dashboard (usage analytics)
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
│   ├── app.js                  # UI interactions (nav, forms, account, admin nav)
│   ├── prompt-coach.js         # CRAFT prompt analysis widget (regex-based)
│   ├── promptCoachAgent.js     # AI-powered prompt improvement (calls backend)
│   └── telemetry.js            # Usage telemetry (page views, completions, etc.)
├── css/
│   └── styles.css              # All styles
├── azure-functions/
│   └── dc-ai-hub/
│       ├── package.json
│       ├── host.json
│       ├── local.settings.example.json
│       └── src/
│           ├── shared/
│           │   ├── validateToken.js    # Entra JWT validation
│           │   └── tableStorage.js     # Azure Table Storage helpers
│           └── functions/
│               ├── prompt-coach.js     # POST /api/prompt-coach
│               ├── telemetry.js        # POST /api/telemetry
│               ├── user-progress.js    # GET /api/user/progress
│               ├── admin-check.js      # GET /api/admin/check
│               └── admin-summary.js    # GET /api/admin/summary
└── README.md
```

## Data Storage

All user data is stored in the browser's `localStorage`, keyed by the authenticated user's UPN:

- `dc_ai_training::<user_upn>::progress` — module completion, practice scores, submissions
- `dc_ai_training::<user_upn>::saved_prompts` — saved prompt library items
