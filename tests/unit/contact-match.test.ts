import {describe,it,expect} from 'vitest';
import {normalizePhone,normalizeCompany,companyEvidence,rankMemberCandidates} from '../../packages/domain/src/contact-match.js';
describe('common contact hints',()=>{
 it('normalizes national and international Japanese numbers without suffix matching',()=>{
  expect(normalizePhone('０３－１２３４－５６７８')).toBe('0312345678');
  expect(normalizePhone('+81 3 1234 5678')).toBe('0312345678');
  expect(normalizePhone('090-1234-5678')).toBe('09012345678');
  for(const x of ['非通知','12345678','+81 (0)3 1234 5678','03-1234-5678 ext 2',''])expect(normalizePhone(x)).toBeNull();
 });
 it('normalizes legal names and ranks partial and bounded typo hints',()=>{
  expect(normalizeCompany('（株） 山田商事')).toBe('山田商事');
  expect(companyEvidence('山田商事株式会社','株式会社山田商事')).toBe('EXACT');
  expect(companyEvidence('山田','株式会社山田商事')).toBe('PARTIAL');
  expect(companyEvidence('山田商司','株式会社山田商事')).toBe('SIMILAR');
  expect(companyEvidence('山','山田商事')).toBe('NONE');
  expect(companyEvidence('株式会社','合同会社')).toBe('NONE');
 });
 it('preserves shared-number ambiguity and prioritizes both identifiers',()=>{
  const members=[{organizationId:'a',name:'山田商事',phones:['03-1234-5678']},{organizationId:'b',name:'別会社',phones:['0312345678']},{organizationId:'c',name:'山田商事',phones:['0312345679']}];
  const result=rankMemberCandidates({company:'山田商事',phone:'0312345678'},members);
  expect(result.map(x=>x.organizationId)).toEqual(['a','b','c']);
  expect(result[0]).toMatchObject({nameEvidence:'EXACT',phoneMatch:true});
  expect(rankMemberCandidates({company:'',phone:'0312345678'},members)).toHaveLength(2);
  expect(rankMemberCandidates({company:'未知企業',phone:'非通知'},members)).toEqual([]);
  expect(rankMemberCandidates({company:'山田商事',phone:'0312345678'},members,1)).toHaveLength(1);
 });
});
