/**
 * Denneen AI Learning Hub — Entra ID Token Validation
 *
 * Validates JWT bearer tokens from MSAL against the Entra JWKS endpoint.
 * Enforces: signature, issuer, audience, expiration, tenant ID, @denneen.com UPN.
 */

const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

const TENANT_ID = process.env.TENANT_ID || '<TENANT_ID>';
const API_CLIENT_ID = process.env.API_CLIENT_ID || '<API_CLIENT_ID>';
const DENNEEN_DOMAIN = 'denneen.com';

const jwksClient = jwksRsa({
    jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true
});

function getSigningKey(header) {
    return new Promise((resolve, reject) => {
        jwksClient.getSigningKey(header.kid, (err, key) => {
            if (err) return reject(err);
            resolve(key.getPublicKey());
        });
    });
}

/**
 * Validate a Bearer token from the Authorization header.
 * Returns the decoded token claims if valid, or throws an error.
 */
async function validateToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);

    // Decode header to get kid for key lookup
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('Invalid token format');
    }

    const signingKey = await getSigningKey(decoded.header);

    // Verify signature, issuer, audience, expiration
    const claims = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
        audience: API_CLIENT_ID,
        clockTolerance: 60 // 1 minute tolerance
    });

    // Enforce tenant ID
    if (claims.tid !== TENANT_ID) {
        throw new Error('Token tenant does not match');
    }

    // Enforce @denneen.com email/UPN
    const email = (claims.preferred_username || claims.upn || claims.email || '').toLowerCase();
    if (!email.endsWith('@' + DENNEEN_DOMAIN)) {
        throw new Error('User is not a Denneen employee');
    }

    return { claims, email };
}

module.exports = { validateToken };
