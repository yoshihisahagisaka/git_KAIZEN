import {describe,it,expect} from 'vitest';
import {decodePushKey,defaultPushEnabled} from '../../apps/web/src/client/request-push-device.js';
describe('device push default and key',()=>{
 it('defaults ON unless explicitly turned OFF',()=>{
  expect(defaultPushEnabled(null)).toBe(true);
  expect(defaultPushEnabled('off')).toBe(false);
 });
 it('decodes public key and rejects malformed input',()=>{
  const bytes=Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]);
  expect(Array.from(decodePushKey(bytes.toString('base64url')))).toEqual(Array.from(bytes));
  for(const v of ['!','AAAA',''])expect(()=>decodePushKey(v)).toThrow();
 });
});
