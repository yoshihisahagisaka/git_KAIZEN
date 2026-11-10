import {Router} from 'express';
import {z} from 'zod';
import {policyActivationInput,policyLevelInput,policyOverviewInput,policyPublicationInput,policyVersionInput,
  type OperatorPolicyAdmin} from './persistence/operator-policy-admin.js';

/** No browser-provided Tenant, administrator, email, verified subject or role.
 * commandBoundary validates live Session and exact Origin/CSRF for writes;
 * each DB command and overview independently rechecks the verified approver. */
export function operatorPolicyAdminRoutes(admin:OperatorPolicyAdmin){
  const router=Router();
  router.get('/admin/operator-policy',async(req,res)=>{
    const input=policyOverviewInput.parse(req.query);
    const data=await admin.overview(res.locals.sessionTokenHash,input);
    res.json({ok:true,data});
  });
  router.get('/admin/operator-policy/activations',async(req,res)=>{
    const {serviceId}=z.strictObject({serviceId:z.uuid()}).parse(req.query);
    const data=await admin.activationOverview(res.locals.sessionTokenHash,serviceId);
    res.json({ok:true,data});
  });
  router.post('/admin/operator-policy/levels',async(req,res)=>{
    const input=policyLevelInput.parse(req.body);
    const data=await admin.assign(res.locals.sessionTokenHash,input);
    res.json({ok:true,data});
  });
  router.post('/admin/operator-policy/versions',async(req,res)=>{
    const input=policyVersionInput.parse(req.body);
    const data=await admin.version(res.locals.sessionTokenHash,input);
    res.json({ok:true,data});
  });
  router.post('/admin/operator-policy/publications',async(req,res)=>{
    const input=policyPublicationInput.parse(req.body);
    const data=await admin.publish(res.locals.sessionTokenHash,input);
    res.json({ok:true,data});
  });
  router.post('/admin/operator-policy/activations',async(req,res)=>{
    const input=policyActivationInput.parse(req.body);
    const data=await admin.activate(res.locals.sessionTokenHash,input);
    res.json({ok:true,data});
  });
  return router;
}
