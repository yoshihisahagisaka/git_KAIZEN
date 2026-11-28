import {createECDH} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
import {createPushSender,loadPushVapid} from '../../apps/web/src/server/request-push-transport.js';
const makeKey=()=>{const key=createECDH('prime256v1');key.generateKeys();return key;};
const vapid=()=>{const key=makeKey();return {subject:'mailto:test@example.invalid',publicKey:key.getPublicKey().toString('base64url'),privateKey:Buffer.concat([Buffer.alloc(32-key.getPrivateKey().length),key.getPrivateKey()]).toString('base64url')};};
describe('Web Push delivery transport',()=>{
 it('disabled by default, fails closed on mismatched key',()=>{
  expect(loadPushVapid({})).toBeNull();
  const key=makeKey();
  expect(()=>loadPushVapid({FACTACT_WEB_PUSH_ENABLED:'true',FACTACT_WEB_PUSH_DELIVERY_ENABLED:'true',FACTACT_WEB_PUSH_PUBLIC_KEY:key.getPublicKey().toString('base64url'),FACTACT_WEB_PUSH_PRIVATE_KEY:Buffer.alloc(32,1).toString('base64url'),FACTACT_WEB_PUSH_SUBJECT:'mailto:test@example.invalid'})).toThrow();
 });
 it('encrypts payload and blocks redirects; no real I/O',async()=>{
  const key=makeKey();
  const target={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',keys:{p256dh:key.getPublicKey().toString('base64url'),auth:Buffer.alloc(16,1).toString('base64url')}};
  const requestId='11111111-1111-4111-8111-111111111111';
  const transport=vi.fn<typeof fetch>(async()=>new Response(null,{status:201}));
  expect(await createPushSender(vapid(),transport)(target,requestId)).toEqual({state:'ACCEPTED',httpStatus:201});
  expect(transport).toHaveBeenCalledTimes(1);
  const [url,init]=transport.mock.calls[0]!;
  expect(url).toBe(target.endpoint);expect(init?.redirect).toBe('error');
  expect(Buffer.from(init!.body as Uint8Array).includes(Buffer.from(requestId))).toBe(false);
  transport.mockResolvedValue(new Response(null,{status:410}));
  expect(await createPushSender(vapid(),transport)(target,requestId)).toEqual({state:'GONE',httpStatus:410});
 });
});
