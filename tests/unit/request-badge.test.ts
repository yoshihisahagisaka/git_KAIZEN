import {describe,it,expect} from 'vitest';
import {
 sumUnreadCounts
} from '../../apps/web/src/client/request-badge.js';

describe('request app badge',()=>{
 it('counts unread notices across services',()=>{
  expect(sumUnreadCounts([2,3,0,4])).toBe(9);
 });

 it('clears when all notices are read',()=>{
  expect(sumUnreadCounts([0,0])).toBe(0);
  expect(sumUnreadCounts([])).toBe(0);
 });

 it('rejects invalid counts',()=>{
  for(const n of [-1,1.5,NaN,Infinity]){
   expect(()=>sumUnreadCounts([n])).toThrow();
  }
 });

 it('rejects unsafe totals',()=>{
  expect(()=>sumUnreadCounts([
   Number.MAX_SAFE_INTEGER,1
  ])).toThrow();
 });
});
