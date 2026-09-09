import type { Operator } from '../../domain/src/operator.js';

export interface Identity { issuer: string; subject: string }
export interface OperatorRef { tenantId: string; operatorId: string }
export interface LoginTransaction { state: string; nonce: string; verifier: string }
export interface SessionRef extends OperatorRef { csrfToken: string }

export interface IdentityStore {
  beginLogin(hash: string, login: LoginTransaction): Promise<void>;
  consumeLogin(hash: string): Promise<LoginTransaction | null>;
  resolveIdentity(identity: Identity): Promise<OperatorRef | null>;
  createSession(hash: string, ref: OperatorRef, csrfToken: string): Promise<void>;
  readSession(hash: string): Promise<SessionRef | null>;
  revokeSession(hash: string): Promise<void>;
  loadActiveOperator(ref: OperatorRef): Promise<Operator | null>;
}

export async function resolveActiveOperator(store: IdentityStore, identity: Identity): Promise<Operator | null> {
  const ref = await store.resolveIdentity(identity);
  return ref ? store.loadActiveOperator(ref) : null;
}

export async function authenticateSession(store: IdentityStore, tokenHash: string): Promise<{ operator: Operator; csrfToken: string } | null> {
  const session = await store.readSession(tokenHash);
  if (!session) return null;
  const operator = await store.loadActiveOperator(session);
  return operator ? { operator, csrfToken: session.csrfToken } : null;
}
