/**
 * FACTACT P0-C: lightweight authoring only. Procedure text is NOT Registry Fact,
 * an approved Knowledge Candidate or executable HTML/Markdown.
 */
export const procedureCategories = ['SCRIPT','PROCEDURE','FAQ'] as const;
export type ProcedureCategory = (typeof procedureCategories)[number];

export const procedureTemplates: Readonly<Record<ProcedureCategory,string>> = {
 SCRIPT: `【利用場面】
（このスクリプトを使う場面）

【案内する内容】
（お客様へお伝えする言葉）

【確認事項】
1. （確認すること）
2. （確認すること）

【状況別の案内】
・該当する場合：
・該当しない場合：

【終話・次の対応】
（終話、折り返し、エスカレーション等）

【参考リンク】
（必要に応じて https:// から始まるURLを記載）`,
 PROCEDURE: `【目的・対象】
（何を、誰に対して行う手順か）

【事前確認】
・（確認事項）
・（注意点）

【対応手順】
1. （手順1）
2. （手順2）
3. （手順3）

【結果確認】
（正常終了を判断する方法）

【解決しない場合】
（次の判断・引継ぎ先）

【参考リンク】
（必要に応じて https:// から始まるURLを記載）`,
 FAQ: `【質問】
（お客様からの質問）

【回答】
（そのまま案内できる回答）

【確認事項】
（回答の前提・条件）

【解決しない場合】
（次の案内・エスカレーション）

【参考リンク】
（必要に応じて https:// から始まるURLを記載）`,
};

export function initialProcedureBody(category:ProcedureCategory):string {
 return procedureTemplates[category];
}

/** A category change never destroys an existing/unsaved body. */
export function bodyForNewCategory(body:string,category:ProcedureCategory):string {
 return body.trim() ? body : initialProcedureBody(category);
}

/** Raw text is stored verbatim. Only the presentation layer makes links. */
export interface ProcedureTextPart {text:string;href:string|null}
const urlPrefix=/https:\/\/[^\s<>"'`]+/g;
const endPunctuation=/[。、，．,.;:!?！？）】」』\]\)]+$/u;

/** Exposes only explicit, absolute HTTPS URLs. A candidate with credentials,
 * a malformed authority, or any unsafe scheme is returned as plain text.
 * The user-visible link text always matches the original destination text. */
export function safeProcedureHref(candidate:string):string|null {
 if(!candidate.startsWith('https://')||candidate.length>2048)return null;
 try {
  const u=new URL(candidate);
  if(u.protocol!=='https:'||!u.hostname||u.username||u.password)return null;
  if(u.host.endsWith('.')||u.hostname.startsWith('.')||!u.hostname.includes('.'))return null;
  if(/[\x00-\x1f\x7f]/.test(candidate))return null;
  return candidate;
 } catch {return null;}
}

export function splitProcedureLinks(body:string):ProcedureTextPart[] {
 const parts:ProcedureTextPart[]=[];
 const push=(text:string,href:string|null)=>{if(text)parts.push({text,href});};
 let cursor=0;
 for(const match of body.matchAll(urlPrefix)){
  const index=match.index,raw=match[0];
  if(index<cursor)continue;
  push(body.slice(cursor,index),null);
  const withoutPunctuation=raw.replace(endPunctuation,'');
  const href=safeProcedureHref(withoutPunctuation);
  if(href){
   push(withoutPunctuation,href);
   push(raw.slice(withoutPunctuation.length),null);
  } else push(raw,null);
  cursor=index+raw.length;
 }
 push(body.slice(cursor),null);
 return parts;
}

/** The runtime body field is a single bounded UTF-8 string, not JSON blocks. */
export function validProcedureBody(body:string):boolean {
 return typeof body==='string'&&body.trim().length>0&&
  new TextEncoder().encode(body).byteLength<=12*1024;
}
