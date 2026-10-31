import { Router } from 'express';
import { z } from 'zod';
import type { JoinCommands } from '../../../../packages/application/src/join-commands.js';
import type { JoinQueries } from '../../../../packages/application/src/join-queries.js';
import type { Operator } from '../../../../packages/domain/src/operator.js';

export interface JoinServices { commands: JoinCommands; queries: JoinQueries }
const id = z.uuid();
const summary = z.string().trim().min(1).max(4000);
export function joinRoutes({ commands: c, queries: q }: JoinServices) {
  const router = Router();
  // The globally mounted commandBoundary authenticates reads and protects ALL unsafe methods.
  const actor = (locals: Record<string, unknown>) => (locals.session as {operator:Operator}).operator;
  const empty = z.strictObject({});
  router.get('/home', async (_req,res) => res.json({ok:true,data:await q.home(actor(res.locals)),warnings:[]}));
  router.post('/join-events', async (req,res) => {
    const input = z.strictObject({organizationId:id,personId:id,serviceId:id,joinDate:z.iso.date()}).parse(req.body);
    res.status(201).json({ok:true,data:await c.createJoinEvent(actor(res.locals),input),warnings:[],correlationId:req.id});
  });
  router.get('/join-events/:id', async (req,res) => res.json({ok:true,data:await q.joinWorkspace(actor(res.locals),id.parse(req.params.id)),warnings:[]}));
  router.post('/join-events/:id/evaluate-requirements', async (req,res) => {
    empty.parse(req.body ?? {});
    res.json({ok:true,data:await c.evaluateJoinRequirements(actor(res.locals),id.parse(req.params.id)),warnings:[],correlationId:req.id});
  });
  router.get('/work', async (_req,res) => res.json({ok:true,data:(await q.home(actor(res.locals))).nextActions,warnings:[]}));
  router.get('/work/:id', async (req,res) => res.json({ok:true,data:await q.workDetail(actor(res.locals),id.parse(req.params.id)),warnings:[]}));
  router.post('/work/:id/take-ownership', async (req,res) => {
    const input = z.strictObject({operatorId:id.optional()}).parse(req.body ?? {});
    res.json({ok:true,data:await c.takeWorkOwnership(actor(res.locals),id.parse(req.params.id),input.operatorId),warnings:[],correlationId:req.id});
  });
  router.post('/work/:id/actions/assign-device', async (req,res) => {
    const input = z.strictObject({deviceId:id,executionSummary:summary,effectiveFrom:z.iso.datetime({offset:true}).transform(v=>new Date(v).toISOString()),replacesRelationId:id.optional()}).parse(req.body);
    res.status(201).json({ok:true,data:await c.startAssignDeviceAction(actor(res.locals),{workId:id.parse(req.params.id),deviceId:input.deviceId,executionSummary:input.executionSummary,effectiveFrom:input.effectiveFrom,...(input.replacesRelationId?{replacesRelationId:input.replacesRelationId}:{})}),warnings:[],correlationId:req.id});
  });
  router.post('/changes/:id/verify', async (req,res) => {
    const input = z.strictObject({verificationSummary:summary,evidenceIds:z.array(id).max(20).optional()}).parse(req.body);
    res.json({ok:true,data:await c.verifyChange(actor(res.locals),id.parse(req.params.id),input.verificationSummary,input.evidenceIds),warnings:[],correlationId:req.id});
  });
  router.post('/changes/:id/commit', async (req,res) => {
    empty.parse(req.body ?? {});
    res.json({ok:true,data:await c.commitChange(actor(res.locals),id.parse(req.params.id)),warnings:[],correlationId:req.id});
  });
  router.post('/changes/:id/reject', async (req,res) => {
    const input = z.strictObject({reason:summary}).parse(req.body);
    res.json({ok:true,data:await c.rejectChange(actor(res.locals),id.parse(req.params.id),input.reason),warnings:[],correlationId:req.id});
  });
  router.get('/people/:id/context', async (req,res) => res.json({ok:true,data:await q.personContext(actor(res.locals),id.parse(req.params.id)),warnings:[]}));
  router.get('/devices', async (_req,res) => res.json({ok:true,data:await q.assignableDevices(actor(res.locals)),warnings:[]}));
  router.post('/work/:id/complete', async (req,res) => {
    const input = z.strictObject({outcome:z.literal('COMPLETED')}).parse(req.body);
    res.json({ok:true,data:await c.completeWork(actor(res.locals),id.parse(req.params.id),input.outcome),warnings:[],correlationId:req.id});
  });
  return router;
}
