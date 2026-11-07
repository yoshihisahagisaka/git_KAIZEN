import {Router} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import {found} from '../../../../packages/domain/src/join.js';
import type {ScopedSupportWorkSummary} from './persistence/scoped-access-reader.js';

export interface ScopedSupportReader {
 supportWorkSummary(tenantId:string,actorId:string,workId:string):Promise<ScopedSupportWorkSummary|null>;
}

/** Never exposes the broad internal SUPPORT query or treats caller affiliation as a grant. */
export function scopedSupportRoutes(reader:ScopedSupportReader){
 const router=Router();
 router.get('/scoped/support-work/:id',async(req,res)=>{
  const workId=z.uuid().parse(req.params.id);
  const actor=(res.locals.session as {operator:Operator}).operator;
  const work=found(await reader.supportWorkSummary(actor.tenantId,actor.id,workId));
  res.json({ok:true,data:work});
 });
 return router;
}
