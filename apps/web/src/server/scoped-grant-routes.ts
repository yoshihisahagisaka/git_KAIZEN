import {Router} from 'express';
import {z} from 'zod';
import {grantIssueInput,grantRevokeInput,type ScopedGrantManager} from './persistence/scoped-grant-manager.js';

/** Human-authorized Grant administration only. Global commandBoundary guards
 * session, Origin and CSRF; the DB also verifies the exact OIDC subject.
 * No approval email or Tenant ID is accepted from browser input. */
export function scopedGrantRoutes(manager:ScopedGrantManager){
 const router=Router();
 router.post('/admin/scoped-grants',async(req,res)=>{
  const input=grantIssueInput.parse(req.body);
  const data=await manager.issue(res.locals.sessionTokenHash,input);
  res.json({ok:true,data});
 });
 router.post('/admin/scoped-grants/:id/revoke',async(req,res)=>{
  const grantId=z.uuid().parse(req.params.id);
  const input=grantRevokeInput.parse(req.body);
  const data=await manager.revoke(res.locals.sessionTokenHash,grantId,input);
  res.json({ok:true,data});
 });
 return router;
}
