import {useState} from 'react';
import {
  bodyForNewCategory,initialProcedureBody,procedureCategories,
  splitProcedureLinks,type ProcedureCategory,
} from '../../../../packages/domain/src/procedure-page-text.js';

export function ProcedureBodyText({body}:{body:string}) {
 const lines=body.replace(/\r\n/g,'\n').split('\n');
 return <div className="procedure-body-text" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>
  {lines.map((line,lineIndex)=><span key={lineIndex}>
   {/^【[^】\n]{1,60}】$/u.test(line.trim())?<strong>{line}</strong>:
    splitProcedureLinks(line).map((part,index)=>part.href
     ?<a key={index} href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a>
     :<span key={index}>{part.text}</span>)}
   {lineIndex<lines.length-1?'\n':null}
  </span>)}
 </div>;
}

const categoryLabel:Readonly<Record<ProcedureCategory,string>>={
 SCRIPT:'トークスクリプト',PROCEDURE:'業務・技術手順書',FAQ:'FAQ',
};

/** Controlled editor component; no network, persistence or authorization.
 * The parent admin form owns saving and rechecks rights on the server. */
export function ProcedureBodyEditor({category,body,onChange,disabled=false}:{
 category:ProcedureCategory;body:string;
 onChange:(value:{category:ProcedureCategory;body:string})=>void;
 disabled?:boolean;
}) {
 const [askReplace,setAskReplace]=useState(false);
 const changeCategory=(next:ProcedureCategory)=>{
  setAskReplace(false);
  // An untouched auto-generated starter may follow the new category.
  // User-edited text (even incomplete) is never replaced implicitly.
  const nextBody=body===initialProcedureBody(category)
   ?initialProcedureBody(next):bodyForNewCategory(body,next);
  onChange({category:next,body:nextBody});
 };
 const insert=()=>{
  if(body.trim()){setAskReplace(true);return;}
  onChange({category,body:initialProcedureBody(category)});
 };
 return <section aria-label="手順書の本文" className="procedure-body-editor">
  <label htmlFor="procedure-category">種類</label>
  <select id="procedure-category" disabled={disabled} value={category}
   onChange={event=>changeCategory(event.target.value as ProcedureCategory)}>
   {procedureCategories.map(value=><option key={value} value={value}>{categoryLabel[value]}</option>)}
  </select>
  <label htmlFor="procedure-body-text">本文（テキスト形式）</label>
  <textarea id="procedure-body-text" value={body} disabled={disabled}
   rows={18} maxLength={12000} onInput={event=>{console.log('P0C_EDITOR_INPUT_LEN',event.currentTarget.value.length);onChange({category,body:event.currentTarget.value});}}/>
  <p>見出しや番号は自由に編集できます。複数の https:// リンクを貼り付けると閲覧時にクリックできます。</p>
  <button type="button" className="secondary" disabled={disabled} onClick={insert}>ひな形を挿入</button>
  {askReplace&&<div role="group" aria-label="ひな形の上書き確認">
   <p>入力済みの本文をひな形で上書きしますか？</p>
   <button type="button" disabled={disabled} onClick={()=>{
    onChange({category,body:initialProcedureBody(category)});
    setAskReplace(false);
   }}>上書きする</button>
   <button type="button" className="secondary" onClick={()=>setAskReplace(false)}>キャンセル</button>
  </div>}
 </section>;
}
