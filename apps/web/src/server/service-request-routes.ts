import {Router,type Response} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import type {PgServiceRequestStore} from './persistence/service-request-store.js';
const id=z.uuid();
const context=z.strictObject({serviceId:id,contractProfileId:id});
const list=context.extend({side:z.enum(['SENT','RECEIVED']),limit:z.coerce.number().int().min(1).max(50).default(30),beforeId:id.optional()});
const create=context.extend({id,type:z.enum(['CALL_REQUEST','SUPPORT_REQUEST','INVESTIGATION_REQUEST','INQUIRY','ONSITE_REQUEST','OTHER']),
 content:z.string().trim().min(1).max(4000),customerName:z.string().max(200).optional(),contactName:z.string().max(200).optional(),desiredAt:z.iso.datetime({offset:true}).nullable().optional(),teams:z.strictObject({mode:z.enum(['ALL','SELECTED','NONE']),recipientIds:z.array(id).max(20)}).optional()});
const respond=z.strictObject({commandId:id,expectedRevision:z.number().int().nonnegative(),status:z.enum(['IN_PROGRESS','COMPLETED']),comment:z.string().max(4000)});
function actor(res:Response){const o=(res.locals.session as {operator:Operator}).operator;return {tenantId:o.tenantId,actorId:o.id};}
export function serviceRequestRoutes(store:PgServiceRequestStore){
 const router=Router();
 router.get('/request-contexts',async(_req,res)=>res.json({ok:true,data:await store.contexts(actor(res))}));
 router.get('/request-teams-recipients',async(req,res)=>{
  res.json({ok:true,data:await store.teamsRecipients(actor(res),context.parse(req.query))});
 });
 router.get('/request-notifications',async(req,res)=>{
  res.json({ok:true,data:await store.notifications(actor(res),context.parse(req.query))});
 });
 router.post('/requests/:id/acknowledge',async(req,res)=>{
  const a=actor(res),requestId=id.parse(req.params.id),input=z.strictObject({throughRevision:z.number().int().min(0).max(2147483647)}).parse(req.body),s=await store.resolveContext(a,requestId);
  res.json({ok:true,data:await store.acknowledge(a,s,requestId,input.throughRevision)});
 });
 router.get('/requests',async(req,res)=>{
  const {serviceId,contractProfileId,side,limit,beforeId}=list.parse(req.query);
  res.json({ok:true,data:await store.list(actor(res),{serviceId,contractProfileId},{side,limit,...(beforeId?{beforeId}:{})})});
 });
 router.post('/requests',async(req,res)=>{
  const {serviceId,contractProfileId,...body}=create.parse(req.body);
  const {id,type,content,customerName,contactName,desiredAt,teams}=body;
  res.status(201).json({ok:true,data:await store.create(actor(res),{serviceId,contractProfileId},{id,type,content,...(customerName!==undefined?{customerName}:{}),...(contactName!==undefined?{contactName}:{}),...(desiredAt!==undefined?{desiredAt}:{}),...(teams!==undefined?{teams}:{})})});
 });
 router.get('/requests/:id',async(req,res)=>{
  const a=actor(res),requestId=id.parse(req.params.id),s=await store.resolveContext(a,requestId);
  res.json({ok:true,data:await store.detail(a,s,requestId)});
 });
 router.post('/requests/:id/responses',async(req,res)=>{
  const a=actor(res),requestId=id.parse(req.params.id),input=respond.parse(req.body),s=await store.resolveContext(a,requestId);
  res.json({ok:true,data:await store.respond(a,s,requestId,input)});
 });
 return router;
}
