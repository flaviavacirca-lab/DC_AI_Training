/* ============================================
   Denneen & Company — AI Learning Hub
   Authentication Module

   Tier 1: Microsoft Entra ID via MSAL.js (when configured)
   Tier 2: Local auth with @denneen.com email validation
   ============================================ */

(function () {
    'use strict';

    var AUTH_KEY = 'dc_ai_hub_auth';
    var DENNEEN_DOMAIN = 'denneen.com';

    // --- MSAL Configuration ---
    // To enable Microsoft sign-in:
    // 1. Register an app in Azure AD (Entra ID)
    // 2. Set redirect URI to your GitHub Pages URL
    // 3. Add the client ID below
    // 4. Include MSAL.js via CDN in your HTML:
    //    <script src="https://alcdn.msauth.net/browser/2.38.0/js/msal-browser.min.js"></script>
    var MSAL_CONFIG = {
        auth: {
            clientId: '', // Azure AD App Registration client ID
            authority: 'https://login.microsoftonline.com/common',
            redirectUri: window.location.origin
        },
        cache: {
            cacheLocation: 'localStorage'
        }
    };

    var msalInstance = null;
    var authCallbacks = [];

    // --- Email Validation ---

    function isValidDenneenEmail(email) {
        if (!email) return false;
        return email.toLowerCase().trim().endsWith('@' + DENNEEN_DOMAIN);
    }

    // --- MSAL ---

    function initMSAL() {
        if (!MSAL_CONFIG.auth.clientId) return false;
        try {
            if (typeof msal !== 'undefined' && msal.PublicClientApplication) {
                msalInstance = new msal.PublicClientApplication(MSAL_CONFIG);
                return true;
            }
        } catch (e) {
            console.log('MSAL not available, using local auth');
        }
        return false;
    }

    // --- Local Auth ---

    function getStoredAuth() {
        try {
            var data = JSON.parse(localStorage.getItem(AUTH_KEY));
            if (data && data.name && data.email) return data;
        } catch (e) {}
        return null;
    }

    function setStoredAuth(name, email) {
        try {
            localStorage.setItem(AUTH_KEY, JSON.stringify({
                name: name,
                email: email.toLowerCase().trim(),
                signedInAt: new Date().toISOString()
            }));
        } catch (e) {}
    }

    function clearStoredAuth() {
        try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
    }

    // --- Migrate from old progress.js user data ---

    function migrateOldUserData() {
        try {
            var oldData = JSON.parse(localStorage.getItem('dc_ai_hub_user'));
            if (oldData && oldData.name && oldData.email && !getStoredAuth()) {
                setStoredAuth(oldData.name, oldData.email);
            }
        } catch (e) {}
    }

    // --- Public API ---

    function getUser() {
        if (msalInstance) {
            var accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                return {
                    name: accounts[0].name || accounts[0].username,
                    email: accounts[0].username
                };
            }
        }
        return getStoredAuth();
    }

    function isAuthenticated() {
        return !!getUser();
    }

    function signIn(name, email) {
        if (msalInstance) {
            msalInstance.loginRedirect({ scopes: ['User.Read'] });
            return { pending: true };
        }
        if (!isValidDenneenEmail(email)) {
            return { error: 'Please use your @denneen.com email address.' };
        }
        setStoredAuth(name, email);
        notifyChange();
        return { success: true };
    }

    function signOut() {
        if (msalInstance) {
            msalInstance.logout();
        }
        clearStoredAuth();
        notifyChange();
    }

    function requireAuth(callback) {
        if (isAuthenticated()) {
            callback(getUser());
        } else {
            showSignInModal(callback);
        }
    }

    function onAuthChange(fn) {
        authCallbacks.push(fn);
    }

    function notifyChange() {
        var user = getUser();
        authCallbacks.forEach(function (fn) {
            try { fn(user); } catch (e) {}
        });
    }

    // --- Sign-In Modal ---

    function showSignInModal(onSuccess) {
        var existing = document.getElementById('signin-modal');
        if (existing) existing.remove();

        if (msalInstance) {
            msalInstance.loginRedirect({ scopes: ['User.Read'] });
            return;
        }

        var modal = document.createElement('div');
        modal.id = 'signin-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML =
            '<div class="modal-content">' +
                '<button class="modal-close" aria-label="Close">&times;</button>' +
                '<h2>Sign In</h2>' +
                '<p>Use your Denneen &amp; Company email to track progress and save prompts.</p>' +
                '<form id="signin-form">' +
                    '<div class="form-group">' +
                        '<label for="signin-name">Your Name</label>' +
                        '<input type="text" id="signin-name" required placeholder="e.g., Jane Smith">' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label for="signin-email">Work Email</label>' +
                        '<input type="email" id="signin-email" required placeholder="your.name@denneen.com">' +
                    '</div>' +
                    '<div class="form-error" id="signin-error" hidden></div>' +
                    '<button type="submit" class="btn btn-primary" style="width:100%">Sign In</button>' +
                '</form>' +
                '<p class="modal-note">Your progress is stored locally in this browser.</p>' +
            '</div>';

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', function () {
            modal.remove();
        });
        modal.addEventListener('click', function (e) {
            if (e.target === modal) modal.remove();
        });

        document.getElementById('signin-form').addEventListener('submit', function (e) {
            e.preventDefault();
            var name = document.getElementById('signin-name').value.trim();
            var email = document.getElementById('signin-email').value.trim();
            var errorEl = document.getElementById('signin-error');

            if (!isValidDenneenEmail(email)) {
                errorEl.textContent = 'Please use your @denneen.com email address.';
                errorEl.hidden = false;
                return;
            }

            var result = signIn(name, email);
            if (result && result.error) {
                errorEl.textContent = result.error;
                errorEl.hidden = false;
                return;
            }

            modal.remove();
            if (typeof onSuccess === 'function') {
                onSuccess(getUser());
            }
        });

        document.getElementById('signin-name').focus();
    }

    // --- Init ---

    migrateOldUserData();
    initMSAL();

    if (msalInstance) {
        msalInstance.handleRedirectPromise().then(function (response) {
            if (response) notifyChange();
        }).catch(function (err) {
            console.error('MSAL redirect error:', err);
        });
    }

    // --- Expose ---

    window.DCAuth = {
        getUser: getUser,
        isAuthenticated: isAuthenticated,
        signIn: signIn,
        signOut: signOut,
        requireAuth: requireAuth,
        showSignInModal: showSignInModal,
        onAuthChange: onAuthChange,
        isValidDenneenEmail: isValidDenneenEmail
    };

})();
