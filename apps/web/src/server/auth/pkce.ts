// REUSE: atlib-ppap-file-transfer/src/lib/pkce.ts (9c1b002); node: import spelling only.
import { randomBytes, createHash } from 'node:crypto';
export function generateCodeVerifier(): string { return randomBytes(32).toString('base64url'); }
export function codeChallengeFromVerifier(verifier: string): string { return createHash('sha256').update(verifier).digest('base64url'); }
export function generateOpaqueValue(): string { return randomBytes(24).toString('base64url'); }
export function tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
