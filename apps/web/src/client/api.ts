export class ApiError extends Error {
  constructor(message:string,readonly code:string,readonly status:number){super(message);}
}
export async function api<T>(url:string,csrf?:string,body?:unknown):Promise<T> {
  const response=await fetch(url,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':csrf ?? ''},body:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok || !result.ok) throw new ApiError(result.error?.message ?? '処理を完了できませんでした。',
    result.error?.code ?? 'UNKNOWN',response.status);
  return result.data;
}
