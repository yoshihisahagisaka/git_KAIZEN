import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {
 bodyForNewCategory,initialProcedureBody,procedureCategories,
 safeProcedureHref,splitProcedureLinks,validProcedureBody,
} from '../../packages/domain/src/procedure-page-text.js';
import {ProcedureBodyText} from '../../apps/web/src/client/procedure-page-text.js';

describe('P0-C simple procedure text templates',()=>{
 it('has one editable plaintext template for each generic page category',()=>{
  expect(procedureCategories).toEqual(['SCRIPT','PROCEDURE','FAQ']);
  expect(initialProcedureBody('SCRIPT')).toContain('【終話・次の対応】');
  expect(initialProcedureBody('PROCEDURE')).toContain('【対応手順】');
  expect(initialProcedureBody('FAQ')).toContain('【質問】');
  for(const kind of procedureCategories){
   expect(initialProcedureBody(kind)).toContain('【参考リンク】');
   expect(validProcedureBody(initialProcedureBody(kind))).toBe(true);
  }
 });
 it('never resets an existing draft when category is changed',()=>{
  const existing='対応中メモ。\nhttps://docs.google.com/document/d/safe';
  expect(bodyForNewCategory(existing,'FAQ')).toBe(existing);
  expect(bodyForNewCategory('  ','PROCEDURE')).toBe(initialProcedureBody('PROCEDURE'));
 });
 it('enforces a bounded UTF-8 body rather than JavaScript character count',()=>{
  expect(validProcedureBody('')).toBe(false);
  expect(validProcedureBody('  ')).toBe(false);
  expect(validProcedureBody('あ'.repeat(4096))).toBe(true);
  expect(validProcedureBody('あ'.repeat(4097))).toBe(false);
 });
});

describe('P0-C safe read-only clickable URL rendering',()=>{
 it('keeps two different inline links and surrounding Japanese text intact',()=>{
  const body='操作： https://docs.google.com/document/d/abc、\nFAQ https://support.example.com/faq?id=1&lang=ja。';
  const parts=splitProcedureLinks(body);
  expect(parts.filter(p=>p.href).map(p=>p.href)).toEqual([
   'https://docs.google.com/document/d/abc',
   'https://support.example.com/faq?id=1&lang=ja',
  ]);
  expect(parts.map(p=>p.text).join('')).toBe(body);
 });
 it('refuses unsafe schemes, nonqualified URLs and embedded credentials',()=>{
  for(const value of [
   'javascript:alert(1)','http://example.com/unsafe','data:text/html,<svg>',
   'https://admin:password@example.com/path','https://','https://intranet',
  ])expect(safeProcedureHref(value)).toBeNull();
  expect(safeProcedureHref('https://docs.google.com/document/d/abc')).toBeTruthy();
 });
 it('highlights conventional bracket headings while retaining plain text steps',()=>{
  const html=renderToStaticMarkup(<ProcedureBodyText
   body={'【対応手順】\\n1. 起動確認\\nhttps://support.example.com/steps'}/>);
  expect(html).toContain('<strong>【対応手順】</strong>');
  expect(html).toContain('1. 起動確認');
  expect(html).toContain('href="https://support.example.com/steps"');
 });

 it('renders exact visible HTTPS URL with safe new tab attributes, no executable HTML',()=>{
  const body='<img src=x onerror=alert(1)>\nhttps://docs.google.com/document/d/abc\n'
   +'javascript:alert(1)\nhttps://admin:password@example.com/private';
  const html=renderToStaticMarkup(<ProcedureBodyText body={body}/>);
  expect(html).toContain('&lt;img');
  expect(html).not.toContain('<img');
  expect(html).toContain('href="https://docs.google.com/document/d/abc"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain('href="https://admin:password@example.com');
  expect(html).toContain('javascript:alert(1)');
 });
 it('does not create links from deceptive or malformed inline candidates',()=>{
  const body='https://example.com@example.org/path https://example.com. https://example.com/foo）';
  const parts=splitProcedureLinks(body);
  expect(parts.filter(p=>p.href).map(p=>p.href)).toEqual([
   'https://example.com',
   'https://example.com/foo',
  ]);
 });
});
