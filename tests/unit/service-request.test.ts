import {describe,it,expect} from 'vitest';
import {createRequest,appendRequestUpdate,projectRequest,requestTypes,requestLabels,type RequestContext} from '../../packages/domain/src/service-request.js';
const at='2026-11-26T00:00:00Z';
const ctx:RequestContext={tenantId:'tenant',serviceId:'service',contractProfileId:'contract',senderPartyId:'provider',recipientPartyId:'partner',direction:'PROVIDER_TO_PARTNER',parentWorkId:'work'};
const create=()=>createRequest(ctx,{id:'request',type:'ONSITE_REQUEST',content:'現地確認をお願いします'},'sender',at);
describe('common service request contract',()=>{
 it('preserves approved labels and direction-specific onsite selection',()=>{
  expect(requestTypes('PARTNER_TO_PROVIDER').map(t=>requestLabels[t])).toEqual(['発信依頼','対応依頼','調査依頼','問合せ','その他']);
  expect(requestTypes('PROVIDER_TO_PARTNER').map(t=>requestLabels[t])).toEqual(['発信依頼','対応依頼','調査依頼','問合せ','オンサイト対応依頼','その他']);
  expect(()=>createRequest({...ctx,direction:'PARTNER_TO_PROVIDER'},{id:'r',type:'ONSITE_REQUEST',content:'test'},'sender',at)).toThrow();
  expect(()=>createRequest(ctx,{id:'r',type:'INQUIRY',content:' '},'sender',at)).toThrow();
 });
 it('records response history without changing original request or parent Work',()=>{
  const entry=create(),original=JSON.stringify(entry);
  expect(projectRequest(entry,[]).status).toBe('PENDING');
  const start=appendRequestUpdate(entry,[],{id:'u1',commandId:'c1',expectedRevision:0,status:'IN_PROGRESS',comment:''},'receiver',at);
  const done=appendRequestUpdate(entry,[start],{id:'u2',commandId:'c2',expectedRevision:1,status:'COMPLETED',comment:'現地対応済み'},'receiver',at);
  expect(projectRequest(entry,[start,done])).toEqual({status:'COMPLETED',revision:2,lastUpdate:done});
  expect(JSON.stringify(entry)).toBe(original);
  expect(()=>appendRequestUpdate(entry,[start,done],{id:'u3',commandId:'c3',expectedRevision:2,status:'IN_PROGRESS',comment:'再開'},'receiver',at)).toThrow();
 });
 it('requires result, rejects stale writes and replays only identical actor and payload',()=>{
  const entry=create(),input={id:'u1',commandId:'c1',expectedRevision:0,status:'COMPLETED' as const,comment:'解決'};
  expect(()=>appendRequestUpdate(entry,[],{...input,comment:' '},'receiver',at)).toThrow();
  const done=appendRequestUpdate(entry,[],input,'receiver',at);
  expect(appendRequestUpdate(entry,[done],input,'receiver',at)).toEqual(done);
  expect(()=>appendRequestUpdate(entry,[done],input,'another',at)).toThrow();
  expect(()=>appendRequestUpdate(entry,[done],{...input,comment:'別結果'},'receiver',at)).toThrow();
  expect(()=>appendRequestUpdate(entry,[done],{...input,commandId:'new'},'receiver',at)).toThrow();
  expect(()=>projectRequest(entry,[{...done,requestId:'foreign'}])).toThrow();
 });
});
