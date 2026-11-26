import {describe,it,expect,vi} from 'vitest';
import {submitTeamsNotice} from '../../apps/web/src/server/teams-notification.js';
const eventId='20000000-0000-4000-8000-000000000123';
const endpoint='https://example.logic.azure.com/workflows/test?sig=synthetic';
describe('Teams Workflow transport (no real network)',()=>{
 it('posts minimal payload with optional mention, treats 202 as acceptance only',async()=>{
  const send=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:202}));
  expect(await submitTeamsNotice(endpoint,{eventId,mentionEmail:'person@example.invalid'},send)).toEqual({state:'ACCEPTED',httpStatus:202});
  const [url,init]=send.mock.calls[0]!;
  expect(url).toBe(endpoint);expect(init?.redirect).toBe('error');
  expect(JSON.parse(String(init?.body))).toEqual({type:'FACTACT_SPECIALIST_REQUEST',eventId,message:'新しい専門対応依頼が届きました。',mentionEmail:'person@example.invalid'});
 });
 it('never sends disabled or untrusted endpoint, rejects arbitrary payload',async()=>{
  const send=vi.fn<typeof fetch>();
  expect(await submitTeamsNotice(undefined,{eventId},send)).toEqual({state:'DISABLED'});
  for(const url of ['http://example.logic.azure.com','https://logic.azure.com.evil.invalid','https://127.0.0.1','https://user@example.logic.azure.com'])
   expect(await submitTeamsNotice(url,{eventId},send)).toEqual({state:'REJECTED'});
  await expect(submitTeamsNotice(endpoint,{eventId,mentionEmail:'not-email'},send)).rejects.toThrow();
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
