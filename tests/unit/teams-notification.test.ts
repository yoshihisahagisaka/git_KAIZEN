import {describe,it,expect,vi} from 'vitest';
import {submitTeamsNotice} from '../../apps/web/src/server/teams-notification.js';
const eventId='20000000-0000-4000-8000-000000000123';
const endpoint='https://example.logic.azure.com/workflows/test?sig=synthetic';
describe('Teams Workflow transport (no real network)',()=>{
 it('posts minimal payload with optional mention, treats 202 as acceptance only',async()=>{
  const send=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:202}));
  expect(await submitTeamsNotice(endpoint,{eventId,mentions:[{objectId:eventId,name:'担当者A'}]},send,'https://factact.example.invalid')).toEqual({state:'ACCEPTED',httpStatus:202});
  const [url,init]=send.mock.calls[0]!;
  expect(url).toBe(endpoint);expect(init?.redirect).toBe('error');
  expect(JSON.parse(String(init?.body))).toMatchObject({type:'message',attachments:[{contentType:'application/vnd.microsoft.card.adaptive',content:{type:'AdaptiveCard',msteams:{entities:[{type:'mention',text:'<at>担当者A</at>',mentioned:{id:eventId,name:'担当者A'}}]},actions:[{type:'Action.OpenUrl',url:'https://factact.example.invalid/requests/'+eventId}]}}]});
 });
 it('supports ALL as multiple resolved mentions and NONE as no mention',async()=>{
 const send=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:202}));
 await submitTeamsNotice(endpoint,{eventId,mentions:[{objectId:eventId,name:'A'},{objectId:'20000000-0000-4000-8000-000000000124',name:'B'}]},send);
 expect(JSON.parse(String(send.mock.calls[0]![1]?.body)).attachments[0].content.msteams.entities).toHaveLength(2);
 await submitTeamsNotice(endpoint,{eventId},send);
 expect(JSON.parse(String(send.mock.calls[1]![1]?.body)).attachments[0].content).not.toHaveProperty('msteams');
 await expect(submitTeamsNotice(endpoint,{eventId,mentions:[{objectId:eventId,name:'A'},{objectId:eventId,name:'B'}]},send)).rejects.toThrow();
 });
 it('never sends disabled or untrusted endpoint, rejects arbitrary payload',async()=>{
  const send=vi.fn<typeof fetch>();
  expect(await submitTeamsNotice(undefined,{eventId},send)).toEqual({state:'DISABLED'});
  for(const url of ['http://example.logic.azure.com','https://logic.azure.com.evil.invalid','https://127.0.0.1','https://user@example.logic.azure.com'])
   expect(await submitTeamsNotice(url,{eventId},send)).toEqual({state:'REJECTED'});
  await expect(submitTeamsNotice(endpoint,{eventId,mentions:[{objectId:'not-id',name:'A'}]},send)).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
 });
 it('distinguishes rejected and ambiguous attempts without retry or leaking errors',async()=>{
  const send=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null,{status:403}))
   .mockResolvedValueOnce(new Response(null,{status:503})).mockRejectedValueOnce(new Error(endpoint));
  expect(await submitTeamsNotice(endpoint,{eventId},send)).toEqual({state:'REJECTED',httpStatus:403});
  expect(await submitTeamsNotice(endpoint,{eventId},send)).toEqual({state:'UNKNOWN',httpStatus:503});
  expect(await submitTeamsNotice(endpoint,{eventId},send)).toEqual({state:'UNKNOWN'});
  expect(send).toHaveBeenCalledTimes(3);
 });
});
