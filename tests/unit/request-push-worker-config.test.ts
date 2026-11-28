import {describe,it,expect} from 'vitest';
import {loadPushWorkerDatabase} from '../../apps/web/src/server/request-push-worker-config.js';
describe('push worker credentials and TLS',()=>{
 const direct='postgresql://factact_runtime:synthetic@db.example.invalid:5432/factact';
 it('does not need OIDC secrets and requires direct TLS',()=>{
  expect(loadPushWorkerDatabase({DATABASE_URL:direct})).toEqual({databaseUrl:direct,databaseSsl:true});
  expect(()=>loadPushWorkerDatabase({DATABASE_URL:direct,DATABASE_SSL:'false'})).toThrow();
 });
 it('allows only explicitly configured loopback proxy',()=>{
  const url='postgresql://factact_runtime:synthetic@127.0.0.1:5432/factact';
  expect(loadPushWorkerDatabase({DATABASE_URL:url,DATABASE_SSL:'false',DATABASE_CONNECTION_MODE:'local-proxy'})).toMatchObject({databaseLocalProxy:true,databaseSsl:false});
  expect(()=>loadPushWorkerDatabase({DATABASE_URL:direct,DATABASE_SSL:'false',DATABASE_CONNECTION_MODE:'local-proxy'})).toThrow();
 });
 it('denies wrong role, absent password and TLS overrides',()=>{
  for(const url of [direct.replace('factact_runtime','postgres'),direct.replace(':synthetic',''),direct+'?sslmode=disable'])
   expect(()=>loadPushWorkerDatabase({DATABASE_URL:url})).toThrow();
 });
});
