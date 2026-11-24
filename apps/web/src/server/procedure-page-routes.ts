import {Router} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import {DomainError} from '../../../../packages/domain/src/join.js';
import {validProcedureBody} from '../../../../packages/domain/src/procedure-page-text.js';
import type {PgProcedurePageStore,ProcedurePageCursor} from './persistence/procedure-page-store.js';

const id=z.uuid();
const category=z.enum(['SCRIPT','PROCEDURE','FAQ']);
const scope=z.enum(['COMMON','SERVICE']);
const title=z.string().trim().min(1).max(160);
const content=z.string().refine(validProcedureBody,'手順書本文は1文字以上、12KiB以内にしてください。');
const reason=z.string().trim().min(1).max(1000);
const order=z.number().int().min(-100000).max(100000);
const request=id;
const pageCreate=z.strictObject({
 requestId:request,scopeKind:scope,serviceId:id.nullable(),category,
 title,bodyText:content,sortOrder:order,reason,
}).refine(x=>(x.scopeKind==='COMMON'&&x.serviceId===null)||
 (x.scopeKind==='SERVICE'&&x.serviceId!==null),'手順書の適用サービスを確認してください。');
const pageEdit=z.strictObject({
 requestId:request,expectedRevision:z.number().int().min(1),
 category,title,bodyText:content,sortOrder:order,reason,
});
const pageToggle=z.strictObject({
 requestId:request,expectedRevision:z.number().int().min(1),reason,
});
const list=z.strictObject({
 q:z.string().max(100).default(''),
 category:category.optional(),limit:z.coerce.number().int().min(1).max(20).default(20),
 cursor:z.string().max(200).optional(),
});
const cursorValue=z.strictObject({sortOrder:z.number().int(),id});
function parseCursor(raw:string|undefined):ProcedurePageCursor|null {
 if(!raw)return null;
 try {
  const decoded=Buffer.from(raw,'base64url').toString('utf8');
  return cursorValue.parse(JSON.parse(decoded));
 } catch {throw new DomainError('INVALID_PROCEDURE_CURSOR','一覧を再読み込みしてください。',400);}
}

/** Existing commandBoundary enforces verified session and exact Origin/CSRF.
 * Read & write authority are checked again by the database-backed store. */
export function procedurePageRoutes(store:PgProcedurePageStore){
 const router=Router();
 const actor=(res:import('express').Response)=>
  (res.locals.session as {operator:Operator}).operator;
 router.get('/support-work/:workId/procedure-pages',async(req,res)=>{
  const workId=id.parse(req.params.workId),params=list.parse(req.query),a=actor(res);
  const data=await store.listForWork(a.tenantId,a.id,workId,{
   q:params.q,category:params.category??null,limit:params.limit,cursor:parseCursor(params.cursor),
  });
  res.json({ok:true,data:{...data,nextCursor:data.nextCursor?
   Buffer.from(JSON.stringify(data.nextCursor)).toString('base64url'):null}});
 });
 router.get('/support-work/:workId/procedure-pages/:pageId',async(req,res)=>{
  const workId=id.parse(req.params.workId),pageId=id.parse(req.params.pageId),a=actor(res);
  res.json({ok:true,data:await store.detailForWork(a.tenantId,a.id,workId,pageId)});
 });
 router.get('/admin/procedure-pages',async(_req,res)=>{
  const a=actor(res);
  res.json({ok:true,data:await store.adminOverview(a.tenantId,a.id)});
 });
 router.post('/admin/procedure-pages',async(req,res)=>{
  const a=actor(res);
  res.status(201).json({ok:true,data:await store.create(a.tenantId,a.id,pageCreate.parse(req.body))});
 });
 router.patch('/admin/procedure-pages/:pageId',async(req,res)=>{
  const a=actor(res);
  res.json({ok:true,data:await store.update(a.tenantId,a.id,
   id.parse(req.params.pageId),pageEdit.parse(req.body))});
 });
 router.post('/admin/procedure-pages/:pageId/publish',async(req,res)=>{
  const a=actor(res);
  res.json({ok:true,data:await store.changeStatus(a.tenantId,a.id,
   id.parse(req.params.pageId),'PUBLISHED',pageToggle.parse(req.body))});
 });
 router.post('/admin/procedure-pages/:pageId/hide',async(req,res)=>{
  const a=actor(res);
  res.json({ok:true,data:await store.changeStatus(a.tenantId,a.id,
   id.parse(req.params.pageId),'HIDDEN',pageToggle.parse(req.body))});
 });
 return router;
}
