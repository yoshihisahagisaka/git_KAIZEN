import {Router} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import {DomainError,found} from '../../../../packages/domain/src/join.js';
import type {ScopedRegistryPeopleCursor,ScopedRegistryPeoplePage} from './persistence/scoped-access-reader.js';

export interface ScopedRegistryReader {
 registryPeople(tenantId:string,actorId:string,serviceId:string,organizationId:string,
  limit:number,cursor:ScopedRegistryPeopleCursor|null):Promise<ScopedRegistryPeoplePage|null>;
}

/** No broad Registry list, contact email, write, inferred Caller access, or
 * tenant-wide fallback. A Service and target Organization are both explicit. */
export function scopedRegistryRoutes(reader:ScopedRegistryReader){
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
 return router;
}
