import {Router} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import {DomainError} from '../../../../packages/domain/src/join.js';
import type {RegistryEditCommands} from '../../../../packages/application/src/registry-edit-commands.js';
import type {RegistryReviewCursor,RegistryReviewPage} from './persistence/registry-review-reader.js';

export interface RegistryReviewReader {
 pending(tenantId:string,actorId:string,limit:number,
  cursor:RegistryReviewCursor|null):Promise<RegistryReviewPage>;
}

/** Never accept an operator, Tenant, recipient or Grant from the browser. */
export function registryReviewRoutes(reader:RegistryReviewReader,commands:RegistryEditCommands){
 const router=Router();
 const queryInput=z.strictObject({limit:z.coerce.number().int().min(1).max(50).default(20),
  cursor:z.string().max(500).optional()});
 const cursorInput=z.strictObject({createdAt:z.iso.datetime({offset:true}),changeId:z.uuid()});
 router.get('/scoped/registry/review-queue',async(req,res)=>{
  const query=queryInput.parse(req.query);
  let cursor:RegistryReviewCursor|null=null;
  if(query.cursor){
   try{
    cursor=cursorInput.parse(JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')));
   }catch{throw new DomainError('INVALID_INPUT','ページ指定が正しくありません。',400);}
  }
  const actor=(res.locals.session as {operator:Operator}).operator;
  const result=await reader.pending(actor.tenantId,actor.id,query.limit,cursor);
  res.json({ok:true,data:result});
 });
 const confirmInput=z.strictObject({attestation:z.literal('REVIEWED_DISPLAY_NAME_CORRECTION_V1')});
 router.post('/scoped/registry/review-queue/:changeId/confirm',async(req,res)=>{
  const changeId=z.uuid().parse(req.params.changeId);
  confirmInput.parse(req.body);
  const actor=(res.locals.session as {operator:Operator}).operator;
  try{
   const result=await commands.confirmDisplayName({tenantId:actor.tenantId,
    actorOperatorId:actor.id},changeId);
   res.json({ok:true,data:{...result,status:'COMMITTED'}});
  }catch(error){
   const code=error&&typeof error==='object'&&'code' in error?error.code:undefined;
   if(code==='42501')throw new DomainError('NOT_FOUND','確認対象を取得できませんでした。',404);
   if(code==='40001'||code==='23505')throw new DomainError('REGISTRY_CONFLICT',
    '変更内容または権限が更新されました。確認待ち一覧を更新してください。',409);
   throw error;
  }
 });
 return router;
}
