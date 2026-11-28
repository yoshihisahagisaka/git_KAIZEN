import {describe,it,expect} from 'vitest';
import {
 validPushEndpoint,
 pushSubscriptionInput,
 pushPublicKey
} from '../../apps/web/src/server/request-push-validation.js';

describe('Web Push subscription validation',()=>{
 it('accepts recognized HTTPS push services',()=>{
  expect(validPushEndpoint(
   'https://fcm.googleapis.com/fcm/send/synthetic'
  )).toBe(true);

  expect(validPushEndpoint(
   'https://web.push.apple.com/synthetic'
  )).toBe(true);
 });

 it('rejects arbitrary and local destinations',()=>{
  for(const endpoint of [
   'http://fcm.googleapis.com/test',
   'https://127.0.0.1/test',
   'https://169.254.169.254/test',
   'https://fcm.googleapis.com.example.com/test',
   'https://user@fcm.googleapis.com/test',
   'https://fcm.googleapis.com:8443/test',
   'https://example.invalid/test',
   ' https://fcm.googleapis.com/test',
   'https://FCM.GOOGLEAPIS.COM/test',
   'https://fcm.googleapis.com:443/test',
   'https://fcm.googleapis.com/'+ 'a'.repeat(2048)
  ]){
   expect(validPushEndpoint(endpoint)).toBe(false);
  }
 });

 it('rejects malformed subscription keys',()=>{
  expect(pushSubscriptionInput.safeParse({
   endpoint:'https://fcm.googleapis.com/test',
   keys:{p256dh:'invalid',auth:'invalid'}
  }).success).toBe(false);
 });

 it('is disabled by default',()=>{
  expect(pushPublicKey({})).toBeNull();
 });

 it('fails closed on incomplete enabled configuration',()=>{
  expect(()=>pushPublicKey({
   FACTACT_WEB_PUSH_ENABLED:'true'
  })).toThrow();
 });
});
