import {Router} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import {DomainError,found} from '../../../../packages/domain/src/join.js';
import type {ScopedSupportWorkCursor,ScopedSupportWorkPage,ScopedSupportWorkSummary} from './persistence/scoped-access-reader.js';

export interface ScopedSupportReader {
 supportWorkSummary(tenantId:string,actorId:string,workId:string):Promise<ScopedSupportWorkSummary|null>;
 supportWorkPage(tenantId:string,actorId:string,limit:number,cursor:ScopedSupportWorkCursor|null):Promise<ScopedSupportWorkPage>;
}

/** Never exposes the broad internal SUPPORT query or treats caller affiliation as a grant. */
export function scopedSupportRoutes(reader:ScopedSupportReader){
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
 router.get('/scoped/support-work/:id',async(req,res)=>{
  const workId=z.uuid().parse(req.params.id);
  const actor=(res.locals.session as {operator:Operator}).operator;
  const work=found(await reader.supportWorkSummary(actor.tenantId,actor.id,workId));
  res.json({ok:true,data:work});
 });
 return router;
}
