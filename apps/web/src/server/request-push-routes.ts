import {Router,type Response} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import type {PgRequestPushStore} from './persistence/request-push-store.js';
import {pushSubscriptionInput,pushPublicKey,validPushEndpoint} from './request-push-validation.js';

function actor(res:Response){
 const o=(res.locals.session as {operator:Operator}).operator;

 return {
  tenantId:o.tenantId,
  actorId:o.id
 };
}

export function requestPushRoutes(
 store:PgRequestPushStore
){
 const router=Router();
 const publicKey=pushPublicKey(process.env);

 router.get('/request-push/config',(_req,res)=>{
  res.json({
   ok:true,
   data:{
    enabled:publicKey!==null,
    publicKey
   }
  });
 });

 router.post('/request-push/subscriptions',async(req,res)=>{
  if(!publicKey){
   res.status(503).json({
    ok:false,
    error:{
     code:'PUSH_DISABLED',
     message:'端末通知は現在無効です。'
    }
   });
   return;
  }

  const input=pushSubscriptionInput.parse(req.body);

  const data=await store.register(
   actor(res),
   res.locals.sessionTokenHash,
   input
  );

  res.status(201).json({ok:true,data});
 });

 router.post('/request-push/status',async(req,res)=>{
  const {endpoint}=z.strictObject({endpoint:z.string().max(2048).refine(validPushEndpoint)}).parse(req.body);
  res.json({ok:true,data:await store.status(actor(res),res.locals.sessionTokenHash,endpoint)});
 });

 router.post('/request-push/revoke',async(req,res)=>{
  const {id}=z.strictObject({id:z.uuid()}).parse(req.body);

  const data=await store.revoke(
   actor(res),
   res.locals.sessionTokenHash,
   id
  );

  res.json({ok:true,data});
 });

 return router;
}
