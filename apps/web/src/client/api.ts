export async function api<T>(url:string,csrf?:string,body?:unknown):Promise<T> {
  const response=await fetch(url,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':csrf ?? ''},body:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok || !result.ok) throw new Error(result.error?.message ?? '処理を完了できませんでした。');
  return result.data;
}
