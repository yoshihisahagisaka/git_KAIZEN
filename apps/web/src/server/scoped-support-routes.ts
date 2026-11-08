import {Router} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import type {SupportCommands} from '../../../../packages/application/src/support-commands.js';
import {DomainError,found} from '../../../../packages/domain/src/join.js';
import type {ScopedSupportHistoryCursor,ScopedSupportWorkHistory,ScopedSupportWorkCursor,ScopedSupportWorkPage,ScopedSupportWorkSummary} from './persistence/scoped-access-reader.js';

export interface ScopedSupportReader {
 supportWorkSummary(tenantId:string,actorId:string,workId:string):Promise<ScopedSupportWorkSummary|null>;
 supportWorkPage(tenantId:string,actorId:string,limit:number,cursor:ScopedSupportWorkCursor|null):Promise<ScopedSupportWorkPage>;
 supportWorkHistory(tenantId:string,actorId:string,workId:string,limit:number,
  cursor:ScopedSupportHistoryCursor|null):Promise<ScopedSupportWorkHistory|null>;
}

/** Never exposes the broad internal SUPPORT query or treats caller affiliation as a grant. */
export function scopedSupportRoutes(reader:ScopedSupportReader,
 writer?:Pick<SupportCommands,'recordScopedSupportResponse'|'correctScopedSupportResponse'>){
 const router=Router();
 const listInput=z.strictObject({limit:z.coerce.number().int().min(1).max(50).default(20),
  cursor:z.string().max(300).optional()});
 const cursorInput=z.strictObject({updatedAt:z.string().datetime({offset:true}),workId:z.uuid()});
 router.get('/scoped/support-work',async(req,res)=>{
  const query=listInput.parse(req.query);
  let cursor:ScopedSupportWorkCursor|null=null;
  if(query.cursor){
   try {
    const decoded=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')) as unknown;
    const parsed=cursorInput.safeParse(decoded);
    if(!parsed.success)throw new Error('Invalid cursor');
    cursor=parsed.data;
   } catch {throw new DomainError('INVALID_INPUT','ページ指定が正しくありません。',400);}
  }
  const actor=(res.locals.session as {operator:Operator}).operator;
  res.json({ok:true,data:await reader.supportWorkPage(actor.tenantId,actor.id,query.limit,cursor)});
 });
 const historyCursorInput=z.strictObject({occurredAt:z.string().datetime({offset:true}),id:z.uuid()});
 router.get('/scoped/support-work/:id/history',async(req,res)=>{
  const workId=z.uuid().parse(req.params.id);
  const query=listInput.parse(req.query);
  let cursor:ScopedSupportHistoryCursor|null=null;
  if(query.cursor){
   try {
    const decoded=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')) as unknown;
    const parsed=historyCursorInput.safeParse(decoded);
    if(!parsed.success)throw new Error('Invalid cursor');
    cursor=parsed.data;
   } catch {throw new DomainError('INVALID_INPUT','ページ指定が正しくありません。',400);}
  }
  const actor=(res.locals.session as {operator:Operator}).operator;
  const history=found(await reader.supportWorkHistory(actor.tenantId,actor.id,workId,query.limit,cursor));
  res.json({ok:true,data:history});
 });
 router.get('/scoped/support-work/:id',async(req,res)=>{
  const workId=z.uuid().parse(req.params.id);
  const actor=(res.locals.session as {operator:Operator}).operator;
  const work=found(await reader.supportWorkSummary(actor.tenantId,actor.id,workId));
  res.json({ok:true,data:work});
 });
 if(writer){
  // One explicit response command only: no Close/approve/reopen, Caller or
  // client-selected Actor/Recipient/Service, and no broad SUPPORT write path.
  const responseInput=z.strictObject({
   requestId:z.uuid(),expectedLifecycleRevision:z.number().int().nonnegative(),
   expectedRecordRevision:z.number().int().nonnegative(),
   responseText:z.string().trim().min(1).max(4000),
   disposition:z.enum(['CUSTOMER_WAIT','INVESTIGATING','MONITORING']),
   followUpAt:z.string().datetime({offset:true}),
  });
  router.post('/scoped/support-work/:id/responses',async(req,res)=>{
   const workId=z.uuid().parse(req.params.id);
   const input=responseInput.parse(req.body);
   const actor=(res.locals.session as {operator:Operator}).operator;
   res.json({ok:true,data:await writer.recordScopedSupportResponse(actor,workId,input)});
  });
  // Text-only append-only correction of the actor's own non-closing response.
  // The Work's disposition, Follow-up and lifecycle are deliberately immutable here.
  const correctionInput=z.strictObject({
   requestId:z.uuid(),expectedRecordRevision:z.number().int().nonnegative(),
   responseText:z.string().trim().min(1).max(4000),
   correctionReason:z.string().trim().min(1).max(1000),
  });
  router.post('/scoped/support-work/:id/responses/:recordId/corrections',async(req,res)=>{
   const workId=z.uuid().parse(req.params.id);
   const supersedesRecordId=z.uuid().parse(req.params.recordId);
   const input=correctionInput.parse(req.body);
   const actor=(res.locals.session as {operator:Operator}).operator;
   res.json({ok:true,data:await writer.correctScopedSupportResponse(actor,workId,
    {...input,supersedesRecordId})});
  });
 }
 return router;
}
