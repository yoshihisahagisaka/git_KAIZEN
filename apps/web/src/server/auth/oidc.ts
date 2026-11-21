import * as oidc from 'openid-client';
import type { Config } from '../config.js';
import type { Identity, LoginTransaction } from '../../../../../packages/application/src/operator-session.js';
import { codeChallengeFromVerifier } from './pkce.js';

export interface IdentityProvider {
  authorizationUrl(login: LoginTransaction): string;
  verifyCallback(url: URL, login: LoginTransaction): Promise<Identity>;
}

export interface GoogleIdentityProvider extends IdentityProvider {
  // For one-shot local administrative proof only; never an application login grant.
  verifyConfirmedEmail(url: URL, login: LoginTransaction, expectedEmail: string): Promise<Identity & { verifiedEmail: string }>;
}

export function confirmedEmailIdentity(
  claims: { iss?: unknown; sub?: unknown; email?: unknown; email_verified?: unknown },
  expectedIssuer: string,
  expectedEmail: string,
): Identity & { verifiedEmail: string } {
  if (claims.iss !== expectedIssuer || typeof claims.sub !== 'string' || !claims.sub ||
      claims.email_verified !== true || typeof claims.email !== 'string' ||
      claims.email.toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error('Google account email is not verified as the approved identity');
  }
  return { issuer: claims.iss, subject: claims.sub, verifiedEmail: expectedEmail };
}

// ADAPT: PPAP src/lib/oidcProvider.ts + src/routes/ssoAuthRoutes.ts.
// Delegate protocol checks to openid-client; map issuer/subject, never email.
export async function createGoogleProvider(config: Config): Promise<GoogleIdentityProvider> {
  const client = await oidc.discovery(new URL(config.issuer), config.clientId, config.clientSecret, undefined, { timeout: 10 });
  oidc.enableNonRepudiationChecks(client);
  async function verifiedClaims(url: URL, login: LoginTransaction) {
    const tokens = await oidc.authorizationCodeGrant(client, url, {
      expectedState: login.state, expectedNonce: login.nonce, pkceCodeVerifier: login.verifier,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims || claims.iss !== config.issuer || !claims.sub) throw new Error('Invalid external identity');
    return claims;
  }
  return {
    authorizationUrl(login) {
      return oidc.buildAuthorizationUrl(client, {
        redirect_uri: config.redirectUri, scope: 'openid email profile',
        state: login.state, nonce: login.nonce,
        code_challenge: codeChallengeFromVerifier(login.verifier), code_challenge_method: 'S256',
      }).href;
    },
    async verifyCallback(url, login) {
      const claims = await verifiedClaims(url, login);
      return { issuer: claims.iss, subject: claims.sub };
    },
    async verifyConfirmedEmail(url, login, expectedEmail) {
      return confirmedEmailIdentity(await verifiedClaims(url, login), config.issuer, expectedEmail);
    },
  };
}
