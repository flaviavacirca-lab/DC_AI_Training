/* ============================================
   Denneen & Company — AI Learning Hub
   Authentication Module (Microsoft Entra ID)
   MSAL.js v2 — Authorization Code Flow + PKCE

   Requires: msal-browser.min.js loaded before this script
   See README.md for Entra App Registration setup
   ============================================ */

(function () {
    'use strict';

    // -------------------------------------------------------
    // Configuration — replace after Entra ID App Registration
    // -------------------------------------------------------
    var TENANT_ID = 'c331761b-b83b-43ce-b317-ad61d9f70b12';
    var CLIENT_ID = '969e9ca8-a9c9-4d8b-8280-48329e53bf2a';
    var DENNEEN_DOMAIN = 'denneen.com';

    // API scope for backend calls.
    // Change to ['api://<API_CLIENT_ID>/DcAiHub.Access'] after creating the
    // API app registration (see README → "Expose an API scope").
    // Until then, 'User.Read' lets acquireTokenSilent succeed without errors.
    var API_SCOPES = ['User.Read'];

    // Derive redirect URIs dynamically (works on localhost & GitHub Pages)
    var basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    var REDIRECT_URI = window.location.origin + basePath + 'auth-callback.html';
    var POST_LOGOUT_URI = window.location.origin + basePath + 'index.html';

    // Session-storage keys
    var INTENDED_URL_KEY = 'dc_ai_hub_intended_url';
    var AUTH_ERROR_KEY = 'dc_ai_hub_auth_error';

    // MSAL configuration
    var msalConfig = {
        auth: {
            clientId: CLIENT_ID,
            authority: 'https://login.microsoftonline.com/' + TENANT_ID,
            redirectUri: REDIRECT_URI,
            postLogoutRedirectUri: POST_LOGOUT_URI,
            navigateToLoginRequestUrl: false
        },
        cache: {
            cacheLocation: 'localStorage',
            storeAuthStateInCookie: false
        }
    };

    var loginRequest = {
        scopes: ['openid', 'profile', 'email']
    };

    var msalInstance = null;
    var redirectHandled = null; // Promise from handleRedirectPromise
    var interactionInProgress = false;

    // --- Initialize MSAL ---

    function initAuth() {
        if (typeof msal === 'undefined' || !msal.PublicClientApplication) {
            console.error('MSAL.js library not loaded. Authentication will not work.');
            return null;
        }
        try {
            msalInstance = new msal.PublicClientApplication(msalConfig);
            return msalInstance;
        } catch (e) {
            console.error('MSAL initialization failed:', e);
            return null;
        }
    }

    // --- Handle redirect promise on every page ---
    // Must be called once on load so MSAL can complete any pending
    // acquireTokenRedirect or loginRedirect that returned to this page.

    function initRedirectHandling() {
        if (!msalInstance) {
            redirectHandled = Promise.resolve(null);
            return;
        }
        redirectHandled = msalInstance.handleRedirectPromise().then(function (response) {
            if (response && response.account) {
                msalInstance.setActiveAccount(response.account);
            }
            return response;
        }).catch(function (err) {
            console.error('MSAL redirect handling error:', err);
            return null;
        });
    }

    // --- Login (MSAL redirect) ---

    function login() {
        if (!msalInstance) {
            var errorEl = document.getElementById('auth-error');
            if (errorEl) {
                errorEl.textContent = 'Authentication library failed to load. Please refresh the page or contact your administrator.';
                errorEl.hidden = false;
            }
            return;
        }
        msalInstance.loginRedirect(loginRequest);
    }

    // --- Logout (MSAL redirect) ---

    function logout() {
        if (!msalInstance) {
            window.location.replace('index.html');
            return;
        }
        msalInstance.logoutRedirect({
            postLogoutRedirectUri: POST_LOGOUT_URI
        });
    }

    // --- Get current user from MSAL cache ---

    function getUser() {
        if (!msalInstance) return null;
        var accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) return null;
        var acct = accounts[0];
        var claims = acct.idTokenClaims || {};
        return {
            name: claims.name || acct.name || acct.username,
            email: (claims.preferred_username || acct.username || '').toLowerCase(),
            upn: (claims.preferred_username || claims.upn || acct.username || '').toLowerCase(),
            tid: claims.tid || ''
        };
    }

    // --- Check authenticated + valid Denneen identity ---

    function isAuthenticated() {
        var user = getUser();
        return user ? validateIdentity(user) : false;
    }

    // --- Validate Denneen identity (anti-spoof) ---

    function validateIdentity(user) {
        if (!user) return false;
        // Tenant ID must match Denneen
        if (user.tid !== TENANT_ID) return false;
        // Email / UPN must be @denneen.com
        var id = user.email || user.upn || '';
        return id.endsWith('@' + DENNEEN_DOMAIN);
    }

    // --- Handle MSAL redirect response (auth-callback.html only) ---

    function handleRedirectResponse() {
        if (!msalInstance) return Promise.reject(new Error('MSAL not initialized'));
        return msalInstance.handleRedirectPromise().then(function (response) {
            if (response) {
                // Login just completed — validate identity
                var user = getUser();
                if (!validateIdentity(user)) {
                    sessionStorage.setItem(AUTH_ERROR_KEY, 'Please sign in with your Denneen work account.');
                    return msalInstance.logoutRedirect({ postLogoutRedirectUri: POST_LOGOUT_URI });
                }
                // Valid — redirect to intended page or account
                var intended = sessionStorage.getItem(INTENDED_URL_KEY);
                sessionStorage.removeItem(INTENDED_URL_KEY);
                window.location.replace(intended || (basePath + 'account.html'));
                return response;
            }
            // No redirect response — go to login
            window.location.replace(basePath + 'index.html');
            return null;
        }).catch(function (err) {
            console.error('Authentication error:', err);
            sessionStorage.setItem(AUTH_ERROR_KEY, 'Authentication failed. Please try again.');
            window.location.replace(basePath + 'index.html');
        });
    }

    // --- Require auth (gate for protected pages) ---

    function requireAuth() {
        if (isAuthenticated()) return true;
        sessionStorage.setItem(INTENDED_URL_KEY, window.location.href);
        window.location.replace('index.html');
        return false;
    }

    // --- Get API access token (primary token helper) ---
    // Uses acquireTokenSilent first, falls back to acquireTokenRedirect.
    // NEVER uses popups. Returns Promise<string|null>.
    // null means a redirect was initiated — callers should stop and wait.

    function getApiAccessToken() {
        if (!msalInstance) return Promise.resolve(null);

        // Wait for any pending redirect to complete first
        var waitFor = redirectHandled || Promise.resolve(null);

        return waitFor.then(function () {
            // Get account
            var account = msalInstance.getActiveAccount();
            if (!account) {
                var accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    account = accounts[0];
                    msalInstance.setActiveAccount(account);
                }
            }
            if (!account) {
                // Not logged in — cannot acquire token
                return null;
            }

            return msalInstance.acquireTokenSilent({
                scopes: API_SCOPES,
                account: account
            }).then(function (response) {
                debugLog('Token acquired silently', { scopes: API_SCOPES });
                return response.accessToken;
            }).catch(function (err) {
                debugLog('Silent token failed', { error: err.errorCode || err.message });

                // Guard: don't start a second interactive request
                if (interactionInProgress) {
                    debugLog('Interaction already in progress — skipping');
                    return null;
                }

                // If interaction is required (consent, MFA, expired session)
                if (err instanceof msal.InteractionRequiredAuthError ||
                    (err.errorCode && (
                        err.errorCode === 'consent_required' ||
                        err.errorCode === 'login_required' ||
                        err.errorCode === 'interaction_required'
                    ))) {
                    interactionInProgress = true;
                    sessionStorage.setItem(INTENDED_URL_KEY, window.location.href);
                    msalInstance.acquireTokenRedirect({
                        scopes: API_SCOPES,
                        account: account
                    });
                    return null; // Redirect initiated — caller should stop
                }

                // Other error — don't break the page
                console.error('Token acquisition failed:', err);
                return null;
            });
        });
    }

    // --- Legacy acquireToken (kept for backward compat, uses redirect fallback) ---

    function acquireToken(scopes) {
        if (!msalInstance) return Promise.reject(new Error('MSAL not initialized'));
        var accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) return Promise.reject(new Error('Not authenticated'));

        var waitFor = redirectHandled || Promise.resolve(null);
        return waitFor.then(function () {
            var request = { scopes: scopes, account: accounts[0] };
            return msalInstance.acquireTokenSilent(request).catch(function (err) {
                // Guard: don't start a second interactive request
                if (interactionInProgress) {
                    return Promise.reject(new Error('Interaction already in progress'));
                }

                if (err instanceof msal.InteractionRequiredAuthError ||
                    (err.errorCode && (
                        err.errorCode === 'consent_required' ||
                        err.errorCode === 'login_required' ||
                        err.errorCode === 'interaction_required'
                    ))) {
                    interactionInProgress = true;
                    sessionStorage.setItem(INTENDED_URL_KEY, window.location.href);
                    msalInstance.acquireTokenRedirect({ scopes: scopes, account: accounts[0] });
                    return Promise.reject(new Error('Redirect initiated for consent'));
                }

                return Promise.reject(err);
            });
        });
    }

    // --- Auth error helpers ---

    function getAuthError() {
        var err = sessionStorage.getItem(AUTH_ERROR_KEY);
        sessionStorage.removeItem(AUTH_ERROR_KEY);
        return err;
    }

    // --- Site-wide gate (runs automatically on every page) ---

    function gateSite() {
        var pageName = window.location.pathname.split('/').pop() || 'index.html';

        // Login page and auth callback are exempt from gating
        if (pageName === 'index.html' || pageName === 'auth-callback.html' || pageName === '') {
            // If already authenticated on login page, redirect to training flow
            if ((pageName === 'index.html' || pageName === '') && isAuthenticated()) {
                window.location.replace('suggested-training-flow.html');
            }
            return;
        }

        // All other pages require authentication
        requireAuth();
    }

    // --- Debug logging (temporary — remove after confirming auth works) ---

    var DEBUG = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    var debugLogs = [];

    function debugLog(msg, data) {
        var entry = { time: new Date().toISOString(), msg: msg };
        if (data) entry.data = data;
        debugLogs.push(entry);
        if (DEBUG) console.log('[DCAuth]', msg, data || '');
    }

    function getDebugInfo() {
        var user = getUser();
        return {
            activeAccount: user ? user.email : '(none)',
            apiScopes: API_SCOPES,
            interactionInProgress: interactionInProgress,
            msalInitialized: !!msalInstance,
            logs: debugLogs
        };
    }

    // --- Cleanup legacy local-auth storage ---

    try { localStorage.removeItem('dc_ai_hub_auth'); } catch (e) {}

    // --- Auto-initialize ---

    initAuth();

    // Handle redirect promise on all pages except auth-callback
    // (auth-callback has its own handleRedirectResponse logic)
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage !== 'auth-callback.html') {
        initRedirectHandling();
    }

    gateSite();

    debugLog('Auth initialized', {
        page: currentPage,
        authenticated: isAuthenticated(),
        account: getUser() ? getUser().email : '(none)'
    });

    // --- Public API ---

    window.DCAuth = {
        login: login,
        logout: logout,
        getUser: getUser,
        isAuthenticated: isAuthenticated,
        requireAuth: requireAuth,
        acquireToken: acquireToken,
        getApiAccessToken: getApiAccessToken,
        handleRedirectResponse: handleRedirectResponse,
        getAuthError: getAuthError,
        getDebugInfo: getDebugInfo,
        TENANT_ID: TENANT_ID,
        API_SCOPES: API_SCOPES
    };

})();
