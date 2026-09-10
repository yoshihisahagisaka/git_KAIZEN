import {Router} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import type {SupportCommands} from '../../../../packages/application/src/support-commands.js';
import type {SupportQueries} from '../../../../packages/application/src/support-queries.js';
export interface SupportServices {commands:SupportCommands;queries:SupportQueries}
export function supportRoutes({commands:c,queries:q}:SupportServices){
 const r=Router(),id=z.uuid(),text=z.string().trim().min(1).max(4000),empty=z.strictObject({});
 const actor=(locals:Record<string,unknown>)=>(locals.session as {operator:Operator}).operator;
 r.get('/support',async(_req,res)=>res.json({ok:true,data:await q.list(actor(res.locals))}));
 r.get('/support/:id',async(req,res)=>res.json({ok:true,data:await q.detail(actor(res.locals),id.parse(req.params.id))}));
 r.post('/support',async(req,res)=>{const input=z.strictObject({requestId:id,personId:id,serviceId:id,symptom:text}).parse(req.body);res.status(201).json({ok:true,data:await c.createEvent(actor(res.locals),input)});});
 r.post('/support/:id/evaluate',async(req,res)=>{const input=z.strictObject({decision:z.enum(['REQUIRED','NOT_APPLICABLE']),reason:z.string().trim().max(4000).default('')}).parse(req.body);res.json({ok:true,data:await c.evaluate(actor(res.locals),id.parse(req.params.id),input.decision,input.reason)});});
 const note=z.string().max(1000);
 r.post('/support-work/:id/records',async(req,res)=>{
  const input=z.strictObject({requestId:id,expectedRevision:z.number().int().nonnegative(),kind:z.enum(['DRAFT','COMPLETION','CORRECTION']),correctionReason:note,notes:z.strictObject({checks:note,action:z.enum(['RESTART_GUIDANCE','CONNECTION_GUIDANCE','OTHER_GUIDANCE','NO_ACTION_REQUIRED']),actionDetails:note,result:z.enum(['CONNECTED','NOT_CONNECTED','UNCONFIRMED']),resultSource:z.enum(['CALLER','OPERATOR','UNKNOWN']),resultDetails:note,exceptionReason:note})}).parse(req.body);
  res.json({ok:true,data:await c.recordWork(actor(res.locals),id.parse(req.params.id),input)});
 });
 r.post('/support-work/:id/resolution',async(req,res)=>{const input=z.strictObject({mode:z.enum(['GUIDANCE_ONLY','NO_ACTION_REQUIRED']),diagnosticEvidence:text,rationale:text,actionSummary:text}).parse(req.body);res.json({ok:true,data:await c.recordResolution(actor(res.locals),id.parse(req.params.id),input)});});
 r.post('/support-work/:id/knowledge',async(req,res)=>{const input=z.strictObject({title:z.string().trim().min(1).max(200),content:text}).parse(req.body);res.json({ok:true,data:await c.saveKnowledge(actor(res.locals),id.parse(req.params.id),input.title,input.content)});});
 r.post('/support-work/:id/complete',async(req,res)=>{empty.parse(req.body??{});res.json({ok:true,data:await c.complete(actor(res.locals),id.parse(req.params.id))});});
 return r;
}
