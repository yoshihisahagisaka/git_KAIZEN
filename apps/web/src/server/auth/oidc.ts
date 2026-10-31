import * as oidc from 'openid-client';
import type { Config } from '../config.js';
import type { Identity, LoginTransaction } from '../../../../../packages/application/src/operator-session.js';
import { codeChallengeFromVerifier } from './pkce.js';

export interface IdentityProvider {
  authorizationUrl(login: LoginTransaction): string;
  verifyCallback(url: URL, login: LoginTransaction): Promise<Identity>;
}

// ADAPT: PPAP src/lib/oidcProvider.ts + src/routes/ssoAuthRoutes.ts.
// Delegate protocol checks to openid-client; map issuer/subject, never email.
export async function createGoogleProvider(config: Config): Promise<IdentityProvider> {
  const client = await oidc.discovery(new URL(config.issuer), config.clientId, config.clientSecret, undefined, { timeout: 10 });
  oidc.enableNonRepudiationChecks(client);
  return {
    authorizationUrl(login) {
      return oidc.buildAuthorizationUrl(client, {
        redirect_uri: config.redirectUri, scope: 'openid email profile',
        state: login.state, nonce: login.nonce,
        code_challenge: codeChallengeFromVerifier(login.verifier), code_challenge_method: 'S256',
      }).href;
    },
    async verifyCallback(url, login) {
      const tokens = await oidc.authorizationCodeGrant(client, url, {
        expectedState: login.state, expectedNonce: login.nonce, pkceCodeVerifier: login.verifier,
        idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (!claims || claims.iss !== config.issuer || !claims.sub) throw new Error('Invalid external identity');
      return { issuer: claims.iss, subject: claims.sub };
    },
  };
}
