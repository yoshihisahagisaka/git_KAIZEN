import type { Operator } from '../../domain/src/operator.js';
import { assertExpectedRelation, assertRole, evaluatePc, found, requireCondition, type Change, type Contract, type JoinEvent, type Work } from '../../domain/src/join.js';
import type { JoinRepository, JoinRuntime, JoinUnitOfWork } from './join-ports.js';

export class JoinCommands {
  constructor(private readonly uow: JoinUnitOfWork, private readonly runtime: JoinRuntime) {}
  private run<T>(actor: Operator, roles: Operator['roles'], command: (r: JoinRepository, current: Operator) => Promise<T>) {
    return this.uow.run(actor.tenantId, async r => {
      const current = found(await r.operator(actor.id));
      assertRole(current, roles);
      return command(r, current);
    });
  }
  private async audit(r: JoinRepository, actor: Operator, eventId: string, type: string, metadata: Record<string, unknown>) {
    await r.appendAudit({ id: this.runtime.id(), tenantId: actor.tenantId, aggregateType: 'JOIN_EVENT', aggregateId: eventId, eventType: type, actorOperatorId: actor.id, occurredAt: this.runtime.now(), metadataJson: metadata });
  }
  private async context(r: JoinRepository, event: JoinEvent): Promise<Contract> {
    const service = found(await r.service(event.serviceId));
    const contract = found(await r.contract(event.contractProfileId));
    const now = this.runtime.now();
    requireCondition(service.status === 'ACTIVE' && contract.status === 'ACTIVE' && contract.serviceId === service.id && contract.effectiveFrom <= now && (!contract.effectiveTo || now < contract.effectiveTo), 'SERVICE_NOT_ACTIVE', '有効なサービス契約を確認してください。');
    return contract;
  }
  createJoinEvent(actor: Operator, input: { organizationId: string; personId: string; serviceId: string; joinDate: string }) {
    return this.run(actor, ['ADMIN','OPERATOR'], async (r, current) => {
      requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(input.joinDate) && Number.isFinite(Date.parse(input.joinDate)) && new Date(input.joinDate).toISOString().slice(0,10) === input.joinDate, 'INVALID_JOIN_DATE', '入社予定日を確認してください。',400);
      const person = found(await r.person(input.personId));
      const service = found(await r.service(input.serviceId));
      requireCondition(person.organizationId === input.organizationId && service.organizationId === input.organizationId && service.status === 'ACTIVE', 'SERVICE_CONTEXT_MISMATCH', '対象者とサービスの組織を確認してください。');
      const at = this.runtime.now();
      const contracts = await r.effectiveContracts(service.id, at);
      requireCondition(contracts.length === 1, 'CONTRACT_NOT_UNIQUE', '有効な契約が一意に決まりません。');
      const contract = contracts[0]!;
      const recipientId = await r.ensureRecipient(this.runtime.id(), service.id, person.id);
      const event: JoinEvent = { id: this.runtime.id(), tenantId: current.tenantId, serviceId: service.id, contractProfileId: contract.id, serviceRecipientId: recipientId, joinDate: input.joinDate, status: 'CREATED', createdByOperatorId: current.id, createdAt: at };
      await r.insertEvent(event);
      await this.audit(r, current, event.id, 'JOIN_EVENT_CREATED', { personId: person.id, contractProfileId: contract.id, contractProfileVersion: contract.version });
      return { eventId: event.id, recipientId, contractProfileVersion: contract.version };
    });
  }
  evaluateJoinRequirements(actor: Operator, eventId: string) {
    return this.run(actor, ['ADMIN','OPERATOR'], async (r, current) => {
      const event = found(await r.event(eventId, true));
      const contract = await this.context(r, event);
      const existing = await r.evaluations(event.id);
      if (existing.length) return { evaluations: existing, works: await r.works(event.id) };
      const person = found(await r.recipientPerson(event.serviceRecipientId));
      await r.person(person.id, true);
      const relation = await r.currentRelation(person.id);
      const rule = contract.configurationJson.requirements.COMPANY_PC;
      const result = evaluatePc(rule, relation);
      const at = this.runtime.now();
      const evaluation = { id: this.runtime.id(), tenantId: current.tenantId, eventId: event.id, requirementCode: 'COMPANY_PC' as const, result: result.result, evaluationVersion: 1, catalogVersion: 'join-v1', basisSummary: result.basis, basisSnapshot: { contractProfileId: contract.id, contractProfileVersion: contract.version, rule, relationId: relation?.id ?? null, primaryDeviceState: relation ? 'VERIFIED' as const : 'UNKNOWN' as const }, evaluatedByOperatorId: current.id, evaluatedAt: at };
      await r.insertEvaluation(evaluation);
      await this.audit(r, current, event.id, 'REQUIREMENT_EVALUATED', { evaluationId: evaluation.id, result: evaluation.result, personId: person.id });
      if (evaluation.result === 'REQUIRED') {
        const work: Work = { id: this.runtime.id(), tenantId: current.tenantId, serviceId: event.serviceId, contractProfileId: contract.id, serviceRecipientId: event.serviceRecipientId, sourceEventId: event.id, sourceRequirementEvaluationId: evaluation.id, title: `${person.displayName} — 会社PCの準備・割当`, status: 'OPEN', outcome: null, workOwnerOperatorId: current.id, nextAction: 'PCを選定し、実施した割当を記録', nextActionOwnerOperatorId: current.id, createdAt: at, updatedAt: at, closedAt: null };
        await r.insertWork(work);
        await this.audit(r, current, event.id, 'WORK_CREATED', { workId: work.id, evaluationId: evaluation.id, personId: person.id });
        await this.audit(r, current, event.id, 'WORK_OWNERSHIP_SET', { workId: work.id, ownerId: current.id });
      }
      await r.markEvaluated(event.id);
      return { evaluations: [evaluation], works: await r.works(event.id) };
    });
  }
  takeWorkOwnership(actor: Operator, workId: string, operatorId = actor.id) {
    return this.run(actor, ['ADMIN','OPERATOR'], async (r, current) => {
      const work = found(await r.work(workId, true));
      await this.context(r, found(await r.event(work.sourceEventId)));
      requireCondition(work.status !== 'COMPLETED', 'WORK_CLOSED', '完了した仕事は変更できません。');
      requireCondition(operatorId === current.id || current.roles.includes('ADMIN'), 'FORBIDDEN', '他の担当者への移管権限がありません。', 403);
      const owner = found(await r.operator(operatorId)); assertRole(owner, ['ADMIN','OPERATOR']);
      work.workOwnerOperatorId = owner.id; work.nextActionOwnerOperatorId = owner.id; work.updatedAt = this.runtime.now();
      await r.saveWorkProgress(work);
      await this.audit(r, current, work.sourceEventId, 'WORK_OWNERSHIP_SET', { workId, ownerId: owner.id });
      return work;
    });
  }
  startAssignDeviceAction(actor: Operator, input: { workId: string; deviceId: string; executionSummary: string; effectiveFrom: string; replacesRelationId?: string }) {
    return this.run(actor, ['ADMIN','OPERATOR'], async (r, current) => {
      requireCondition(Number.isFinite(Date.parse(input.effectiveFrom)), 'INVALID_EFFECTIVE_TIME', '実際の変更日時を確認してください。',400);
      input = {...input,effectiveFrom:new Date(input.effectiveFrom).toISOString()};
      const work = found(await r.work(input.workId, true));
      const event = found(await r.event(work.sourceEventId));
      const contract = await this.context(r, event);
      assertRole(current, contract.configurationJson.deviceAssignment.executeRoles);
      requireCondition(work.status !== 'COMPLETED', 'WORK_CLOSED', '完了した仕事では実行できません。');
      const evaluation = (await r.evaluations(event.id)).find(e => e.id === work.sourceRequirementEvaluationId);
      requireCondition(evaluation?.result === 'REQUIRED', 'WORK_NOT_EXECUTABLE', '実行可能な要件がありません。');
      requireCondition(!(await r.changes(work.id)).some(c => ['PROPOSED','VERIFIED'].includes(c.status)), 'CHANGE_PENDING', '未確定の変更を先に確認してください。');
      const person = found(await r.recipientPerson(event.serviceRecipientId));
      await r.person(person.id, true);
      const device = found(await r.device(input.deviceId, true));
      const previous = await r.currentRelation(person.id);
      requireCondition(device.deviceStatus === 'AVAILABLE' && !(await r.deviceRelation(device.id)), 'DEVICE_NOT_ASSIGNABLE', 'このPCは割当できません。');
      requireCondition((input.replacesRelationId ?? null) === (previous?.id ?? null), 'REPLACEMENT_CONFIRMATION_REQUIRED', '現在の利用PCとの置換を明示的に確認してください。');
      const at = this.runtime.now();
      requireCondition(Number.isFinite(Date.parse(input.effectiveFrom)) && input.effectiveFrom <= at && input.executionSummary.trim().length > 0, 'EXECUTION_EVIDENCE_REQUIRED', '実施内容と実際の変更日時を記録してください。');
      const action = { id: this.runtime.id(), tenantId: current.tenantId, workId: work.id, actorOperatorId: current.id, resultSummary: input.executionSummary, startedAt: at, completedAt: at };
      const change: Change = { id: this.runtime.id(), tenantId: current.tenantId, workId: work.id, actionId: action.id, subjectId: person.id, status: 'PROPOSED', proposedEffectJson: { personId: person.id, deviceId: device.id, previousRelationId: previous?.id ?? null, previousState: previous ? 'VERIFIED' : 'UNKNOWN', effectiveFrom: input.effectiveFrom }, verificationSummary: null, verifiedByOperatorId: null, verifiedAt: null, committedAt: null, createdAt: at };
      assertExpectedRelation(change.proposedEffectJson, previous);
      await r.insertAction(action, device.id); await r.insertChange(change);
      await r.insertEvidence({ id: this.runtime.id(), tenantId: current.tenantId, evidenceType: 'EXECUTION_ATTESTATION', title: '割当実施記録', contentText: input.executionSummary, createdByOperatorId: current.id, createdAt: at }, change.id);
      work.status = 'IN_PROGRESS'; work.nextAction = '変更内容とEvidenceを検証'; work.updatedAt = at;
      await r.saveWorkProgress(work);
      for (const type of ['ACTION_STARTED','ACTION_COMPLETED','CHANGE_PROPOSED']) await this.audit(r, current, event.id, type, { actionId: action.id, changeId: change.id, workId: work.id, personId: person.id });
      return { actionId: action.id, changeId: change.id, proposedEffect: change.proposedEffectJson };
    });
  }
  private async reviewContext(r: JoinRepository, current: Operator, change: Change) {
    const work = found(await r.work(change.workId, true));
    const contract = await this.context(r, found(await r.event(work.sourceEventId)));
    assertRole(current, contract.configurationJson.deviceAssignment.reviewRoles);
    const action = found(await r.action(change.actionId));
    requireCondition(action.workId === work.id && action.completedAt && action.resultSummary.trim(), 'EXECUTION_EVIDENCE_REQUIRED', '実施記録がありません。');
    requireCondition(contract.configurationJson.deviceAssignment.allowSelfReview || action.actorOperatorId !== current.id, 'SELF_REVIEW_FORBIDDEN', '別のレビュー担当者が必要です。', 403);
    return work;
  }
  private async validateEffect(r: JoinRepository, change: Change) {
    const effect = change.proposedEffectJson;
    found(await r.person(effect.personId, true));
    const device = found(await r.device(effect.deviceId, true));
    assertExpectedRelation(effect, await r.currentRelation(effect.personId));
    requireCondition(device.deviceStatus === 'AVAILABLE' && !(await r.deviceRelation(effect.deviceId)), 'DEVICE_NOT_ASSIGNABLE', '割当先PCの状態が変わりました。');
  }
  verifyChange(actor: Operator, changeId: string, summary: string, evidenceIds: string[] = []) {
    return this.run(actor, ['ADMIN','REVIEWER'], async (r, current) => {
      const change = found(await r.change(changeId, true));
      const work = await this.reviewContext(r, current, change);
      requireCondition(change.status === 'PROPOSED', 'CHANGE_NOT_PROPOSED', '提案中の変更だけ検証できます。');
      requireCondition(summary.trim().length > 0, 'VERIFICATION_REQUIRED', '検証内容を記録してください。');
      await this.validateEffect(r, change);
      for (const id of evidenceIds) { found(await r.evidence(id)); await r.linkEvidence(id, change.id); }
      const at = this.runtime.now();
      await r.insertEvidence({ id: this.runtime.id(), tenantId: current.tenantId, evidenceType: 'VERIFICATION', title: '変更検証', contentText: summary, createdByOperatorId: current.id, createdAt: at }, change.id);
      change.status = 'VERIFIED'; change.verificationSummary = summary; change.verifiedByOperatorId = current.id; change.verifiedAt = at;
      await r.saveChangeReview(change);
      work.nextAction = '検証済みの変更を確定'; work.updatedAt = at; await r.saveWorkProgress(work);
      await this.audit(r, current, work.sourceEventId, 'CHANGE_VERIFIED', { changeId, workId: work.id, personId: change.subjectId });
      return change;
    });
  }
  commitChange(actor: Operator, changeId: string) {
    return this.run(actor, ['ADMIN','REVIEWER'], async (r, current) => {
      const change = found(await r.change(changeId, true));
      const work = await this.reviewContext(r, current, change);
      if (change.status === 'COMMITTED') return found(await r.relationForChange(change.id));
      requireCondition(change.status === 'VERIFIED' && change.verifiedAt, 'CHANGE_NOT_VERIFIED', 'この変更は未検証のため確定できません。');
      await this.validateEffect(r, change);
      const effect = change.proposedEffectJson, at = this.runtime.now();
      if (effect.previousRelationId) await r.endRelation(effect.previousRelationId, effect.effectiveFrom);
      const relation = { id: this.runtime.id(), tenantId: current.tenantId, fromEntityId: effect.personId, toEntityId: effect.deviceId, status: 'ACTIVE' as const, effectiveFrom: effect.effectiveFrom, effectiveTo: null, sourceChangeId: change.id, reliability: 'VERIFIED' as const, verifiedAt: change.verifiedAt, createdAt: at };
      await r.insertRelation(relation);
      change.status = 'COMMITTED'; change.committedAt = at; await r.saveChangeReview(change);
      work.nextAction = '準備状況を確認して仕事を完了'; work.updatedAt = at; await r.saveWorkProgress(work);
      for (const type of ['CHANGE_COMMITTED','RELATION_EFFECTIVE']) await this.audit(r, current, work.sourceEventId, type, { changeId, relationId: relation.id, workId: work.id, personId: effect.personId });
      return relation;
    });
  }
  completeWork(actor: Operator, workId: string, outcome: 'COMPLETED') {
    return this.run(actor, ['ADMIN','OPERATOR'], async (r, current) => {
      const work = found(await r.work(workId, true));
      await this.context(r, found(await r.event(work.sourceEventId)));
      if (work.status === 'COMPLETED') return work;
      const changes = await r.changes(work.id);
      requireCondition(outcome === 'COMPLETED' && changes.some(c => c.status === 'COMMITTED') && changes.every(c => c.status === 'COMMITTED' || c.status === 'REJECTED'), 'COMMITTED_CHANGE_REQUIRED', '必要な変更を確定してから仕事を完了してください。');
      work.status = 'COMPLETED'; work.outcome = outcome; work.closedAt = this.runtime.now(); work.updatedAt = work.closedAt; work.nextAction = '完了';
      await r.saveWorkProgress(work);
      await this.audit(r, current, work.sourceEventId, 'WORK_COMPLETED', { workId, outcome });
      return work;
    });
  }
  rejectChange(actor: Operator, changeId: string, reason: string) {
    return this.run(actor,['ADMIN','REVIEWER'],async(r,current)=>{
      const change = found(await r.change(changeId,true));
      const work = await this.reviewContext(r,current,change);
      requireCondition(['PROPOSED','VERIFIED'].includes(change.status) && reason.trim(), 'CHANGE_NOT_REJECTABLE','未確定の変更と却下理由を確認してください。');
      change.status='REJECTED';
      await r.saveChangeReview(change);
      work.nextAction='実施内容を確認し、変更を提案し直す'; work.updatedAt=this.runtime.now();
      await r.saveWorkProgress(work);
      await this.audit(r,current,work.sourceEventId,'CHANGE_REJECTED',{changeId,workId:work.id,reason});
      return change;
    });
  }
}
