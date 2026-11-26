import {describe,it,expect} from 'vitest';
import {requestBrand,requestManifest} from '../../apps/web/src/server/request-pwa.js';
describe('request PWA public manifest',()=>{
 it('uses stable same-origin app identity and no account data',()=>{
  const b=requestBrand({FACTACT_REQUEST_PWA_BRAND_JSON:JSON.stringify({slug:'sonix-one',name:'SONIX ONE',shortName:'SONIX ONE'})});
  expect(requestManifest(b)).toMatchObject({id:'/portal/sonix-one',start_url:'/portal/sonix-one',scope:'/',display:'standalone'});
 });
 it('rejects arbitrary path or extra fields',()=>{
  expect(()=>requestBrand({FACTACT_REQUEST_PWA_BRAND_JSON:'{"slug":"../x","name":"X","shortName":"X"}'})).toThrow('Invalid request PWA brand configuration');
 });
});
