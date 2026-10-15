import { useState } from 'react';
import { api } from './api.js';
import type { ExploreSearchResult, ExploreSearchType } from '../../../../packages/application/src/explore-ports.js';

const categories: Array<{type: ExploreSearchType | 'ALL'; label: string}> = [
  {type:'ALL',label:'すべて'}, {type:'ORGANIZATION',label:'組織'}, {type:'PERSON',label:'人'},
  {type:'DEVICE',label:'端末'}, {type:'SERVICE',label:'サービス'}, {type:'WORK',label:'仕事'},
  {type:'KNOWLEDGE_CANDIDATE',label:'ナレッジ候補'},
];
const labels: Record<ExploreSearchType,string> = {
  ORGANIZATION:'組織', PERSON:'人', DEVICE:'端末', SERVICE:'サービス', WORK:'仕事', KNOWLEDGE_CANDIDATE:'ナレッジ候補',
};

function detailLink(result: ExploreSearchResult) {
  if (result.resultType==='PERSON') return `#/people/${result.entityId}`;
  if (result.resultType==='WORK' && result.metadata?.lane==='CHANGE') return `#/work/${result.entityId}`;
  return null;
}

export function ExploreUI({initialQuery=''}:{initialQuery?:string}) {
  const [text,setText]=useState(initialQuery);
  const [category,setCategory]=useState<ExploreSearchType | 'ALL'>('ALL');
  const [results,setResults]=useState<ExploreSearchResult[] | null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [searched,setSearched]=useState('');

  async function search() {
    const query=text.trim();
    if (!query) { setError('検索語を入力してください。'); setResults(null); return; }
    if (query.length>200) { setError('検索語は200文字以内で入力してください。'); setResults(null); return; }
    setLoading(true);setError('');setResults(null);
    try {
      const params=new URLSearchParams({q:query,limit:'20'});
      if (category!=='ALL') params.set('types',category);
      const response=await api<{results:ExploreSearchResult[]}>(`/api/explore/search?${params.toString()}`);
      setResults(response.results);setSearched(query);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '検索結果を取得できませんでした。'); }
    finally { setLoading(false); }
  }

  return <section className="explore-page" aria-labelledby="explore-heading">
    <p className="eyebrow">調べる</p><h1 id="explore-heading">情報を探す</h1>
    <p>必要な情報を探して確認できます。検索しただけでは、仕事・管理情報・ナレッジ候補は変更されません。</p>{initialQuery&&<p className="notice">作業から検索語の候補を入れました。内容を確認・編集してから検索してください。</p>}
    <form className="explore-search" onSubmit={event=>{event.preventDefault();void search();}}>
      <label htmlFor="explore-query">検索語</label>
      <div className="explore-search-row"><input id="explore-query" name="query" value={text} onChange={event=>setText(event.target.value)} maxLength={201} autoFocus placeholder="例: 氏名、資産番号、サービス名" />
        <button disabled={loading}>検索</button></div>
    </form>
    <section aria-label="検索カテゴリ"><h2>カテゴリ</h2><div className="explore-categories">{categories.map(item=><button key={item.type} type="button" className="secondary" aria-pressed={category===item.type} onClick={()=>setCategory(item.type)}>{item.label}</button>)}</div></section>
    {loading&&<p role="status">検索しています…</p>}
    {error&&<p role="alert">{error}</p>}
    {results!==null&&<section aria-live="polite" aria-label="検索結果"><h2>検索結果</h2><p>{searched} の結果: {results.length}件を表示しています（表示上限20件）。</p>{results.length===0?<p className="notice">該当する情報は見つかりませんでした。別の検索語やカテゴリをお試しください。</p>:<div className="explore-results">{results.map(result=>{
      const link=detailLink(result);
      return <article key={`${result.resultType}-${result.entityId}`} className="explore-result"><p className="badge">{labels[result.resultType]}</p>
        {link?<h3><a href={link}>{result.primaryLabel}</a></h3>:<h3>{result.primaryLabel}</h3>}
        {result.secondaryLabel&&<p>{result.secondaryLabel}</p>}
        {result.resultType==='KNOWLEDGE_CANDIDATE'&&<p className="notice">ナレッジ候補です。承認済みの手順・ルールではありません。</p>}
      </article>;
    })}</div>}</section>}
  </section>;
}
