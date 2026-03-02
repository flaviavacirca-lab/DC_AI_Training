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

    // --- Handle MSAL redirect response (auth-callback.html) ---

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

    // --- Acquire access token for API calls ---

    function acquireToken(scopes) {
        if (!msalInstance) return Promise.reject(new Error('MSAL not initialized'));
        var accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) return Promise.reject(new Error('Not authenticated'));
        var request = { scopes: scopes, account: accounts[0] };
        return msalInstance.acquireTokenSilent(request).catch(function (err) {
            // Silent failed (e.g. token expired) — try popup
            return msalInstance.acquireTokenPopup(request);
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

    // --- Cleanup legacy local-auth storage ---

    try { localStorage.removeItem('dc_ai_hub_auth'); } catch (e) {}

    // --- Auto-initialize and gate ---

    initAuth();
    gateSite();

    // --- Public API ---

    window.DCAuth = {
        login: login,
        logout: logout,
        getUser: getUser,
        isAuthenticated: isAuthenticated,
        requireAuth: requireAuth,
        acquireToken: acquireToken,
        handleRedirectResponse: handleRedirectResponse,
        getAuthError: getAuthError,
        TENANT_ID: TENANT_ID
    };

})();
