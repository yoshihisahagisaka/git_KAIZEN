import {describe,it,expect} from 'vitest';
import {mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {validateHumanReviewEnvironment,validateIdentityProof,removeHumanReviewDirectory} from '../../scripts/human-review-runner.js';

const env={NODE_ENV:'development',APP_ORIGIN:'http://localhost:5173',OIDC_ISSUER:'https://accounts.google.com',OIDC_CLIENT_ID:'configured',OIDC_CLIENT_SECRET:'configured',OIDC_REDIRECT_URI:'http://localhost:5173/auth/callback'};
describe('Human Review runner safety',()=>{
 it('accepts only the exact localhost Google OIDC boundary',()=>{expect(validateHumanReviewEnvironment(env)).toMatchObject({APP_ORIGIN:env.APP_ORIGIN});expect(()=>validateHumanReviewEnvironment({...env,APP_ORIGIN:'http://0.0.0.0:5173'})).toThrow();expect(()=>validateHumanReviewEnvironment({...env,OIDC_REDIRECT_URI:'http://localhost:8080/auth/callback'})).toThrow();});
 it('requires a recent Google verification proof',()=>{const now=Date.parse('2026-11-01T10:00:00Z'),proof={issuer:'https://accounts.google.com',subject:'synthetic-reviewer',verifiedAt:'2026-11-01T09:45:00.000Z'};expect(validateIdentityProof(proof,now).subject).toBe('synthetic-reviewer');expect(()=>validateIdentityProof({...proof,verifiedAt:'2026-11-01T09:00:00.000Z'},now)).toThrow('Fresh local Google verification');});
 it('cleans only an exact runner-owned directory',async()=>{const directory=await mkdtemp(resolve('.factact-human-review-'));await removeHumanReviewDirectory(directory);await expect(removeHumanReviewDirectory(resolve('.'))).rejects.toThrow('Unsafe Human Review cleanup target');});
});
