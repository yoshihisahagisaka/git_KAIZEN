import {describe,it,expect} from 'vitest';
import {parseCtiReception} from '../../packages/domain/src/cti-reception.js';

describe('MOT/TEL reception hint',()=>{
 it('normalizes a domestic number',()=>{
  expect(parseCtiReception('?tel=03-1234-5678'))
   .toEqual({phone:'0312345678',kind:'NUMBER'});
 });

 it('normalizes an encoded international number',()=>{
  expect(parseCtiReception('?tel=%2B81-90-1234-5678'))
   .toEqual({phone:'09012345678',kind:'NUMBER'});
 });

 it('supports withheld or absent caller number',()=>{
  for(const input of [
   '', '?tel=', '?tel=非通知',
   '?tel=unknown', '?tel=anonymous'
  ]){
   expect(parseCtiReception(input))
    .toEqual({phone:'',kind:'UNKNOWN'});
  }
 });

 it('rejects ambiguous repeated parameters',()=>{
  expect(parseCtiReception(
   '?tel=0312345678&tel=0399999999'
  )).toEqual({phone:'',kind:'UNKNOWN'});
 });

 it('rejects oversized and non-phone input',()=>{
  for(const input of [
   '?tel='+ '1'.repeat(81),
   '?tel='+ '1'.repeat(600),
   '?tel=%3Cscript%3E',
   '?tel=javascript:alert(1)'
  ]){
   expect(parseCtiReception(input))
    .toEqual({phone:'',kind:'UNKNOWN'});
  }
 });
});
