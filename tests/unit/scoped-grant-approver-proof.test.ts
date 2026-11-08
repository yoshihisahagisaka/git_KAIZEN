import {describe,expect,it} from 'vitest';
import {confirmedEmailIdentity} from '../../apps/web/src/server/auth/oidc.js';
import {validateGrantApproverProof} from '../../scripts/scoped-grant-approver-bootstrap.js';

const email='yoshihisa.hagisaka@atlib.jp';
const issuer='https://accounts.google.com';
const now=Date.parse('2026-11-08T10:00:00Z');
const claims={iss:issuer,sub:'synthetic-google-subject',email,email_verified:true};

describe('independent real-account proof for local single-approver bootstrap',()=>{
  it('accepts only an authenticated issuer and confirmed approved Google email',()=>{
    expect(confirmedEmailIdentity(claims,issuer,email)).toEqual({
      issuer,subject:'synthetic-google-subject',verifiedEmail:email,
    });
    expect(confirmedEmailIdentity({...claims,email:email.toUpperCase()},issuer,email).verifiedEmail).toBe(email);
    for (const unapproved of [
      {...claims,email_verified:false},{...claims,email:'another@atlib.jp'},
      {...claims,iss:'https://seed.example.invalid'},{...claims,sub:''},
      {...claims,email_verified:undefined},{...claims,email:undefined},
    ]) expect(()=>confirmedEmailIdentity(unapproved,issuer,email)).toThrow();
  });
  it('only accepts fresh proof carrying the exact verified account label',()=>{
    const proof={issuer,subject:claims.sub,verifiedEmail:email,verifiedAt:new Date(now).toISOString()};
    expect(validateGrantApproverProof(proof,now)).toEqual(proof);
    expect(()=>validateGrantApproverProof({...proof,verifiedEmail:'another@atlib.jp'},now)).toThrow();
    expect(()=>validateGrantApproverProof({...proof,subject:''},now)).toThrow();
    expect(()=>validateGrantApproverProof({...proof,verifiedAt:new Date(now-600_001).toISOString()},now)).toThrow();
    expect(()=>validateGrantApproverProof({...proof,verifiedAt:new Date(now+1000).toISOString()},now)).toThrow();
    expect(()=>validateGrantApproverProof({...proof,additional:'untrusted'},now)).toThrow();
  });
});
