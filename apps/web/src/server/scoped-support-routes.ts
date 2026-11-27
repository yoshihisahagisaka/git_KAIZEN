import type {MemberCandidate} from '../../../../packages/domain/src/contact-match.js';
import {Router} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import type {SupportCommands} from '../../../../packages/application/src/support-commands.js';
import {DomainError,found} from '../../../../packages/domain/src/join.js';
import type {ScopedOwnerCandidates,ScopedPendingReceiptPage,ScopedIntakeReceipt,ScopedIntakeOrganizationCursor,ScopedIntakeOrganizationPage,ScopedIntakeServiceCursor,ScopedIntakeServicePage,ScopedSupportServiceContextPage,ScopedSupportHistoryCursor,ScopedSupportWorkHistory,ScopedSupportWorkCursor,ScopedSupportWorkPage,ScopedSupportWorkSummary} from './persistence/scoped-access-reader.js';

export interface ScopedSupportReader {
 relatedInquiries?(tenantId:string,actorId:string,workId:string):Promise<{eventId:string;items:{eventId:string;workId:string;title:string;status:string}[];canEdit:boolean}|null>;
 changeRelatedInquiry?(tenantId:string,actorId:string,workId:string,targetEventId:string,commandId:string,kind:'LINKED'|'UNLINKED'):Promise<{revision:number}>;
 scopedMemberCandidates?(tenantId:string,actorId:string,serviceId:string,company:string,phone:string):Promise<{items:MemberCandidate[];tooMany:boolean}>;
 scopedIntakeServices?(tenantId:string,actorId:string,limit:number,
  cursor:ScopedIntakeServiceCursor|null):Promise<ScopedIntakeServicePage>;
 scopedSupportServiceContexts?(tenantId:string,actorId:string,limit:number,
  cursor:ScopedIntakeServiceCursor|null):Promise<ScopedSupportServiceContextPage>;
 scopedIntakeOrganizations?(tenantId:string,actorId:string,serviceId:string,
  limit:number,cursor:ScopedIntakeOrganizationCursor|null,q?:string):Promise<ScopedIntakeOrganizationPage>;
 scopedPendingReceipts?(tenantId:string,actorId:string,serviceId:string,limit:number,cursor:{createdAt:string;eventId:string}|null):Promise<ScopedPendingReceiptPage>;
 scopedIntakeReceipt?(tenantId:string,actorId:string,serviceId:string,
  eventId:string):Promise<ScopedIntakeReceipt|null>;
 scopedOwnerCandidates?(tenantId:string,actorId:string,workId:string,limit:number,cursor:string|null):Promise<ScopedOwnerCandidates|null>;
 supportWorkSummary(tenantId:string,actorId:string,workId:string):Promise<ScopedSupportWorkSummary|null>;
 supportWorkPage(tenantId:string,actorId:string,limit:number,cursor:ScopedSupportWorkCursor|null,serviceId?:string,organizationId?:string):Promise<ScopedSupportWorkPage>;
 supportWorkHistory(tenantId:string,actorId:string,workId:string,limit:number,
  cursor:ScopedSupportHistoryCursor|null):Promise<ScopedSupportWorkHistory|null>;
}

/** Never exposes the broad internal SUPPORT query or treats caller affiliation as a grant. */
export function scopedSupportRoutes(reader:ScopedSupportReader,
 writer?:Pick<SupportCommands,'recordScopedSupportResponse'|'correctScopedSupportResponse'|'recordScopedNewCallerIntake'>&
  Partial<Pick<SupportCommands,'recordScopedIntakeBeneficiary'|'recordScopedExistingCallerIntake'|'recordScopedNewCallerInOrganization'|'evaluateScopedReceivedEvent'|'closeScopedSupportWork'|'reopenScopedSupportWork'|'transferScopedSupportOwner'|'recordScopedEscalation'>>){
 const router=Router();
 const listInput=z.strictObject({limit:z.coerce.number().int().min(1).max(50).default(20),
  cursor:z.string().max(300).optional(),serviceId:z.uuid().optional()});
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
  res.json({ok:true,data:await reader.supportWorkPage(actor.tenantId,actor.id,query.limit,cursor,query.serviceId)});
 });
 // An authorization-filtered service selector; this does NOT enumerate
 // customer Organizations/People or grant Registry read permissions.
 if(reader.scopedIntakeServices){
  const serviceQuery=z.strictObject({
   limit:z.coerce.number().int().min(1).max(20).default(20),
   cursor:z.string().max(400).optional(),
  });
  const serviceCursor=z.strictObject({name:z.string().min(1).max(200),id:z.uuid()});
  router.get('/scoped/support-intake/services',async(req,res)=>{
   const query=serviceQuery.parse(req.query);
   let cursor:ScopedIntakeServiceCursor|null=null;
   if(query.cursor){
    try {
     const data=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')) as unknown;
     cursor=serviceCursor.parse(data);
    }catch{throw new DomainError('INVALID_INPUT','ページ指定が正しくありません。',400);}
   }
   const actor=(res.locals.session as {operator:Operator}).operator;
   const data=await reader.scopedIntakeServices!(actor.tenantId,actor.id,query.limit,cursor);
   res.json({ok:true,data:{items:data.items,nextCursor:data.nextCursor?
    Buffer.from(JSON.stringify(data.nextCursor)).toString('base64url'):null}});
  });
 }
 // Separate navigation candidates: do not broaden the existing intake API.
 if(reader.scopedSupportServiceContexts){
  const querySchema=z.strictObject({limit:z.coerce.number().int().min(1).max(20).default(20),cursor:z.string().max(400).optional()});
  const cursorSchema=z.strictObject({name:z.string().min(1).max(200),id:z.uuid()});
  router.get('/scoped/support-service-contexts',async(req,res)=>{
   const query=querySchema.parse(req.query);
   let cursor:ScopedIntakeServiceCursor|null=null;
   if(query.cursor){
    try{cursor=cursorSchema.parse(JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')) as unknown);}
    catch{throw new DomainError('INVALID_INPUT','ページ指定が正しくありません。',400);}
   }
   const actor=(res.locals.session as {operator:Operator}).operator;
   const data=await reader.scopedSupportServiceContexts!(actor.tenantId,actor.id,query.limit,cursor);
   res.json({ok:true,data:{items:data.items,nextCursor:data.nextCursor?
    Buffer.from(JSON.stringify(data.nextCursor)).toString('base64url'):null}});
  });
 }
 // Explicit REGISTRY READ is required in addition to SERVICE-level
 // SUPPORT CREATE; no other organization in this Tenant is discoverable.
 if(reader.scopedIntakeOrganizations){
  const orgQuery=z.strictObject({
   limit:z.coerce.number().int().min(1).max(20).default(20),
   cursor:z.string().max(400).optional(),
   q:z.string().max(100).default(''),
  });
  const orgCursor=z.strictObject({name:z.string().min(1).max(200),id:z.uuid()});
  router.get('/scoped/support-intake/services/:serviceId/organizations',async(req,res)=>{
   const serviceId=z.uuid().parse(req.params.serviceId);
   const query=orgQuery.parse(req.query);
   let cursor:ScopedIntakeOrganizationCursor|null=null;
   if(query.cursor){
    try {
     cursor=orgCursor.parse(JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')) as unknown);
    }catch{throw new DomainError('INVALID_INPUT','ページ指定が正しくありません。',400);}
   }
   const actor=(res.locals.session as {operator:Operator}).operator;
   const data=await reader.scopedIntakeOrganizations!(actor.tenantId,actor.id,serviceId,query.limit,cursor,query.q);
   res.json({ok:true,data:{items:data.items,nextCursor:data.nextCursor?
    Buffer.from(JSON.stringify(data.nextCursor)).toString('base64url'):null}});
  });
 }
 // POST keeps customer search terms out of URL/access logs; read-only operation.
 if(reader.scopedMemberCandidates){
  const schema=z.strictObject({company:z.string().max(200).default(''),phone:z.string().max(80).default('')});
  router.post('/scoped/support-intake/services/:serviceId/member-candidates',async(req,res)=>{
   const serviceId=z.uuid().parse(req.params.serviceId),q=schema.parse(req.body);
   const actor=(res.locals.session as {operator:Operator}).operator;
   res.json({ok:true,data:await reader.scopedMemberCandidates!(actor.tenantId,actor.id,serviceId,q.company,q.phone)});
  });
 }
 // Recent customer history reuses the same authorized Work projection.
 router.get('/scoped/support-intake/services/:serviceId/organizations/:organizationId/recent',async(req,res)=>{
  const serviceId=z.uuid().parse(req.params.serviceId),organizationId=z.uuid().parse(req.params.organizationId);
  z.strictObject({}).parse(req.query);
  const actor=(res.locals.session as {operator:Operator}).operator;
  const page=await reader.supportWorkPage(actor.tenantId,actor.id,5,null,serviceId,organizationId);
  res.json({ok:true,data:{items:page.items}});
 });
 // Own newly received Caller context, not an all-Tenant SUPPORT read.
 if(reader.scopedPendingReceipts){
  const schema=z.strictObject({serviceId:z.uuid(),limit:z.coerce.number().int().min(1).max(20).default(20),cursor:z.string().max(400).optional()});
  const cursorSchema=z.strictObject({createdAt:z.string().datetime({offset:true}),eventId:z.uuid()});
  router.get('/scoped/support-intake/pending',async(req,res)=>{
   const query=schema.parse(req.query);
   let cursor:{createdAt:string;eventId:string}|null=null;
   if(query.cursor){
    try{cursor=cursorSchema.parse(JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')) as unknown);}
    catch{throw new DomainError('INVALID_INPUT','ページ指定が正しくありません。',400);}
   }
   const actor=(res.locals.session as {operator:Operator}).operator;
   res.json({ok:true,data:await reader.scopedPendingReceipts!(actor.tenantId,actor.id,query.serviceId,query.limit,cursor)});
  });
 }
 if(reader.scopedIntakeReceipt){
  router.get('/scoped/support-intake/events/:eventId/beneficiary',async(req,res)=>{
   const eventId=z.uuid().parse(req.params.eventId);
   const {serviceId}=z.strictObject({serviceId:z.uuid()}).parse(req.query);
   const actor=(res.locals.session as {operator:Operator}).operator;
   const receipt=await reader.scopedIntakeReceipt!(actor.tenantId,actor.id,serviceId,eventId);
   res.json({ok:true,data:found(receipt)});
  });
 }
 const historyCursorInput=z.strictObject({occurredAt:z.string().datetime({offset:true}),id:z.uuid()});
 router.get('/scoped/support-work/:id/history',async(req,res)=>{
  const workId=z.uuid().parse(req.params.id);
  const query=listInput.parse(req.query);
  let cursor:ScopedSupportHistoryCursor|null=null;
  if(query.cursor){
   try {
    const decoded=JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')) as unknown;
    const parsed=historyCursorInput.safeParse(decoded);
    if(!parsed.success)throw new Error('Invalid cursor');
    cursor=parsed.data;
   } catch {throw new DomainError('INVALID_INPUT','ページ指定が正しくありません。',400);}
  }
  const actor=(res.locals.session as {operator:Operator}).operator;
  const history=found(await reader.supportWorkHistory(actor.tenantId,actor.id,workId,query.limit,cursor));
  res.json({ok:true,data:history});
 });
 if(reader.scopedOwnerCandidates){
  const schema=z.strictObject({limit:z.coerce.number().int().min(1).max(20).default(20),cursor:z.uuid().optional()});
  router.get('/scoped/support-work/:id/owner-candidates',async(req,res)=>{
   const workId=z.uuid().parse(req.params.id),q=schema.parse(req.query);
   const actor=(res.locals.session as {operator:Operator}).operator;
   res.json({ok:true,data:found(await reader.scopedOwnerCandidates!(actor.tenantId,actor.id,workId,q.limit,q.cursor??null))});
  });
 }
 if(reader.relatedInquiries&&reader.changeRelatedInquiry){
  router.get('/scoped/support-work/:id/related-inquiries',async(req,res)=>{
   const actor=(res.locals.session as {operator:Operator}).operator;
   res.json({ok:true,data:found(await reader.relatedInquiries!(actor.tenantId,actor.id,z.uuid().parse(req.params.id)))});
  });
  router.post('/scoped/support-work/:id/related-inquiries',async(req,res)=>{
   const actor=(res.locals.session as {operator:Operator}).operator;
   const q=z.strictObject({eventId:z.uuid(),commandId:z.uuid(),kind:z.enum(['LINKED','UNLINKED'])}).parse(req.body);
   res.json({ok:true,data:await reader.changeRelatedInquiry!(actor.tenantId,actor.id,z.uuid().parse(req.params.id),q.eventId,q.commandId,q.kind)});
  });
 }
 router.get('/scoped/support-work/:id',async(req,res)=>{
  const workId=z.uuid().parse(req.params.id);
  const actor=(res.locals.session as {operator:Operator}).operator;
  const work=found(await reader.supportWorkSummary(actor.tenantId,actor.id,workId));
  res.json({ok:true,data:work});
 });
 if(writer){
  // This intentionally accepts a new/unlisted company and a new Caller only:
  // no tenant-wide Org/Person lookup and no implicit beneficiary confirmation.
  // Caller input is not a verified identity, membership or authorization Grant.
  const newCaller=z.strictObject({
   kind:z.literal('NEW'),organizationName:z.string().trim().min(1).max(200),
   displayName:z.string().trim().min(1).max(200),email:z.email().optional(),
   distinctPersonConfirmed:z.literal(false),
  });
  const intakeInput=z.strictObject({
   requestId:z.uuid(),serviceId:z.uuid(),symptom:z.string().trim().min(1).max(4000),
   caller:newCaller,decision:z.enum(['REQUIRED','NOT_APPLICABLE','DEFERRED']),
   reason:z.string().trim().max(4000),
  });
  router.post('/scoped/support-intake/new-caller',async(req,res)=>{
   const input=intakeInput.parse(req.body);
   const actor=(res.locals.session as {operator:Operator}).operator;
   const data=await writer.recordScopedNewCallerIntake(actor,input);
   res.status(201).json({ok:true,data});
  });
  if(writer.recordScopedNewCallerInOrganization){
   const inputSchema=z.strictObject({
    requestId:z.uuid(),serviceId:z.uuid(),symptom:z.string().trim().min(1).max(4000),
    caller:z.strictObject({kind:z.literal('NEW'),organizationId:z.uuid(),
     displayName:z.string().trim().min(1).max(200),email:z.email().optional(),distinctPersonConfirmed:z.boolean()}),
    decision:z.enum(['REQUIRED','NOT_APPLICABLE','DEFERRED']),reason:z.string().trim().max(4000),
   });
   router.post('/scoped/support-intake/new-caller-in-organization',async(req,res)=>{
    const input=inputSchema.parse(req.body);
    const actor=(res.locals.session as {operator:Operator}).operator;
    const result=await writer.recordScopedNewCallerInOrganization!(actor,input);
    res.status(201).json({ok:true,data:result});
   });
  }
  if(writer.recordScopedExistingCallerIntake){
   const existingInput=z.strictObject({
    requestId:z.uuid(),serviceId:z.uuid(),
    symptom:z.string().trim().min(1).max(4000),
    caller:z.strictObject({kind:z.literal('EXISTING'),personId:z.uuid()}),
    decision:z.enum(['REQUIRED','NOT_APPLICABLE','DEFERRED']),
    reason:z.string().trim().max(4000),
   });
   router.post('/scoped/support-intake/existing-caller',async(req,res)=>{
    const input=existingInput.parse(req.body);
    const actor=(res.locals.session as {operator:Operator}).operator;
    const result=await writer.recordScopedExistingCallerIntake!(actor,input);
    res.status(201).json({ok:true,data:result});
   });
  }
  if(writer.evaluateScopedReceivedEvent){
   const schema=z.strictObject({serviceId:z.uuid(),decision:z.enum(['REQUIRED','NOT_APPLICABLE']),reason:z.string().trim().max(4000)});
   router.post('/scoped/support-intake/events/:eventId/evaluate',async(req,res)=>{
    const eventId=z.uuid().parse(req.params.eventId),input=schema.parse(req.body);
    const actor=(res.locals.session as {operator:Operator}).operator;
    const data=await writer.evaluateScopedReceivedEvent!(actor,input.serviceId,eventId,input.decision,input.reason);
    res.json({ok:true,data});
   });
  }
  if(writer.recordScopedIntakeBeneficiary){
   const confirmedInput=z.strictObject({
    requestId:z.uuid(),serviceId:z.uuid(),
    expectedRevision:z.number().int().nonnegative(),
    kind:z.literal('CONFIRMED'),organizationId:z.uuid(),
    reason:z.string().trim().min(1).max(1000),
    humanConfirmed:z.literal(true),
   });
   router.post('/scoped/support-intake/events/:eventId/beneficiary',async(req,res)=>{
    const eventId=z.uuid().parse(req.params.eventId),input=confirmedInput.parse(req.body);
    const actor=(res.locals.session as {operator:Operator}).operator;
    const result=await writer.recordScopedIntakeBeneficiary!(actor,input.serviceId,eventId,{
     requestId:input.requestId,expectedRevision:input.expectedRevision,kind:'CONFIRMED',
     organizationId:input.organizationId,reason:input.reason,
    });
    res.json({ok:true,data:{decisionId:result.id,revision:result.revision,
     kind:result.kind,eventId}});
   });
  }
  // One explicit response command only: no Close/approve/reopen, Caller or
  // client-selected Actor/Recipient/Service, and no broad SUPPORT write path.
  const responseInput=z.strictObject({
   requestId:z.uuid(),expectedLifecycleRevision:z.number().int().nonnegative(),
   expectedRecordRevision:z.number().int().nonnegative(),
   responseText:z.string().trim().min(1).max(4000),
   disposition:z.enum(['CUSTOMER_WAIT','INVESTIGATING','MONITORING']),
   followUpAt:z.string().datetime({offset:true}),
  });
  router.post('/scoped/support-work/:id/responses',async(req,res)=>{
   const workId=z.uuid().parse(req.params.id);
   const input=responseInput.parse(req.body);
   const actor=(res.locals.session as {operator:Operator}).operator;
   res.json({ok:true,data:await writer.recordScopedSupportResponse(actor,workId,input)});
  });
  // Separate explicit lifecycle operations, never widen the ordinary response route.
  if(writer.closeScopedSupportWork){
   const schema=z.strictObject({requestId:z.uuid(),expectedLifecycleRevision:z.number().int().nonnegative(),
    expectedRecordRevision:z.number().int().nonnegative(),responseText:z.string().trim().min(1).max(4000),
    outcome:z.enum(['RESOLVED','NOT_ELIGIBLE','WITHDRAWN','OTHER_RESPONSIBILITY_ENDED']),
    closeReason:z.string().trim().min(1).max(1000),confirmsOutstandingResponsibilityEnded:z.literal(true)});
   router.post('/scoped/support-work/:id/close',async(req,res)=>{
    const workId=z.uuid().parse(req.params.id),input=schema.parse(req.body);
    const actor=(res.locals.session as {operator:Operator}).operator;
    const {outcome,closeReason,confirmsOutstandingResponsibilityEnded,...response}=input;
    res.json({ok:true,data:await writer.closeScopedSupportWork!(actor,workId,{...response,
     disposition:'COMPLETED',followUpAt:null,close:{outcome,closeReason,confirmsOutstandingResponsibilityEnded}})});
   });
  }
  if(writer.reopenScopedSupportWork){
   const schema=z.strictObject({requestId:z.uuid(),expectedLifecycleRevision:z.number().int().nonnegative(),
    expectedCloseDecisionId:z.uuid().nullable(),reason:z.string().trim().min(1).max(1000),
    disposition:z.enum(['CUSTOMER_WAIT','INVESTIGATING','MONITORING']),followUpAt:z.string().datetime({offset:true})});
   router.post('/scoped/support-work/:id/reopen',async(req,res)=>{
    const workId=z.uuid().parse(req.params.id),input=schema.parse(req.body);
    const actor=(res.locals.session as {operator:Operator}).operator;
    res.json({ok:true,data:await writer.reopenScopedSupportWork!(actor,workId,input)});
   });
  }
  if(writer.transferScopedSupportOwner){
   const schema=z.strictObject({requestId:z.uuid(),expectedLifecycleRevision:z.number().int().nonnegative(),
    expectedOwnerId:z.uuid(),newOwnerId:z.uuid(),reason:z.string().trim().min(1).max(1000)});
   router.post('/scoped/support-work/:id/owner-transfer',async(req,res)=>{
    const workId=z.uuid().parse(req.params.id),input=schema.parse(req.body);
    const actor=(res.locals.session as {operator:Operator}).operator;
    res.json({ok:true,data:await writer.transferScopedSupportOwner!(actor,workId,input)});
   });
  }
  if(writer.recordScopedEscalation){
   const base={requestId:z.uuid(),expectedLifecycleRevision:z.number().int().nonnegative(),reason:z.string().trim().min(1).max(4000)};
   const schema=z.discriminatedUnion('kind',[
    z.strictObject({...base,kind:z.literal('REQUEST'),target:z.string().trim().min(1).max(200),requested:z.string().trim().min(1).max(1000)}),
    z.strictObject({...base,kind:z.literal('RESULT'),escalationEventId:z.uuid()}),
   ]);
   router.post('/scoped/support-work/:id/escalations',async(req,res)=>{
    const workId=z.uuid().parse(req.params.id),input=schema.parse(req.body);
    const actor=(res.locals.session as {operator:Operator}).operator;
    const result=await writer.recordScopedEscalation!(actor,workId,input);
    res.json({ok:true,data:{id:result.id,kind:result.kind,revision:result.revision}});
   });
  }
  // Text-only append-only correction of the actor's own non-closing response.
  // The Work's disposition, Follow-up and lifecycle are deliberately immutable here.
  const correctionInput=z.strictObject({
   requestId:z.uuid(),expectedRecordRevision:z.number().int().nonnegative(),
   responseText:z.string().trim().min(1).max(4000),
   correctionReason:z.string().trim().min(1).max(1000),
  });
  router.post('/scoped/support-work/:id/responses/:recordId/corrections',async(req,res)=>{
   const workId=z.uuid().parse(req.params.id);
   const supersedesRecordId=z.uuid().parse(req.params.recordId);
   const input=correctionInput.parse(req.body);
   const actor=(res.locals.session as {operator:Operator}).operator;
   res.json({ok:true,data:await writer.correctScopedSupportResponse(actor,workId,
    {...input,supersedesRecordId})});
  });
 }
 return router;
}
