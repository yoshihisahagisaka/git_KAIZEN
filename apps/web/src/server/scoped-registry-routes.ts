import {Router} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import {DomainError,found} from '../../../../packages/domain/src/join.js';
import type {ScopedRegistryPeopleCursor,ScopedRegistryPeoplePage} from './persistence/scoped-access-reader.js';
import type {RegistryEditCommands} from '../../../../packages/application/src/registry-edit-commands.js';

export interface ScopedRegistryReader {
 registryPeople(tenantId:string,actorId:string,serviceId:string,organizationId:string,
  limit:number,cursor:ScopedRegistryPeopleCursor|null):Promise<ScopedRegistryPeoplePage|null>;
}

/** No broad Registry list, contact email, write, inferred Caller access, or
 * tenant-wide fallback. A Service and target Organization are both explicit. */
export function scopedRegistryRoutes(reader:ScopedRegistryReader,commands?:RegistryEditCommands){
 const router=Router();
 const queryInput=z.strictObject({serviceId:z.uuid(),limit:z.coerce.number().int().min(1).max(50).default(20),
  cursor:z.string().max(500).optional()});
 const cursorInput=z.strictObject({displayName:z.string().min(1).max(200),personId:z.uuid()});
 router.get('/scoped/registry/organizations/:organizationId/people',async(req,res)=>{
  const organizationId=z.uuid().parse(req.params.organizationId);
  const query=queryInput.parse(req.query);
  let cursor:ScopedRegistryPeopleCursor|null=null;
  if(query.cursor){
   try{
    const candidate=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')) as unknown;
    const parsed=cursorInput.safeParse(candidate);
    if(!parsed.success)throw Error('Bad cursor');
    cursor=parsed.data;
   }catch{throw new DomainError('INVALID_INPUT','ページ指定が正しくありません。',400);}
  }
  const actor=(res.locals.session as {operator:Operator}).operator;
  const result=found(await reader.registryPeople(actor.tenantId,actor.id,query.serviceId,organizationId,query.limit,cursor));
  res.json({ok:true,data:result});
 });
 if(commands){
  const proposalInput=z.strictObject({serviceId:z.uuid(),requestId:z.uuid(),requestKey:z.uuid(),
   proposedDisplayName:z.string().trim().min(1).max(200),
   reason:z.string().trim().min(1).max(1000),
   expectedRegistryRevision:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)});
  router.post('/scoped/registry/people/:personId/display-name-proposals',async(req,res)=>{
   const personId=z.uuid().parse(req.params.personId);
   const input=proposalInput.parse(req.body);
   // Actor and Tenant are NEVER accepted from request body or URL.
   const actor=(res.locals.session as {operator:Operator}).operator;
   try{
    const result=await commands.proposeDisplayName({tenantId:actor.tenantId,
     actorOperatorId:actor.id},{...input,personId});
    res.status(202).json({ok:true,data:{...result,status:'PENDING_REVIEW'}});
   }catch(error){
    const code=error&&typeof error==='object'&&'code' in error?error.code:undefined;
    if(code==='42501')throw new DomainError('NOT_FOUND','対象の登録情報を確認できませんでした。',404);
    if(code==='40001'||code==='23505')throw new DomainError('REGISTRY_CONFLICT',
     '登録情報が更新された可能性があります。最新情報を確認してください。',409);
    throw error;
   }
  });
 }
 return router;
}
