import type { Operator } from '../../domain/src/operator.js';
import { found, type Relation } from '../../domain/src/join.js';
import type { JoinRepository, JoinUnitOfWork } from './join-ports.js';

export class JoinQueries {
  constructor(private readonly uow: JoinUnitOfWork) {}
  private run<T>(actor: Operator, query: (r: JoinRepository) => Promise<T>) {
    return this.uow.run(actor.tenantId, async r => { found(await r.operator(actor.id)); return query(r); },true);
  }
  private async fact(r: JoinRepository, relation: Relation | null) {
    if (!relation) return null;
    const device = found(await r.device(relation.toEntityId));
    return { relationId: relation.id, deviceId: device.id, assetTag: device.assetTag, semanticType: 'FACT' as const, reliability: relation.reliability, sourceChangeId: relation.sourceChangeId, verifiedAt: relation.verifiedAt, effectiveFrom: relation.effectiveFrom };
  }
  home(actor: Operator) {
    return this.run(actor, async r => {
      const events = await r.events();
      const works = (await Promise.all(events.map(e=>r.works(e.id)))).flat();
      return { people: await r.people(), services: await r.services(), events, nextActions: works.filter(w=>w.status!=='COMPLETED'), needsAttention: works.filter(w=>w.status==='OPEN') };
    });
  }
  joinWorkspace(actor: Operator, eventId: string) {
    return this.run(actor, async r => {
      const event = found(await r.event(eventId)), person = found(await r.recipientPerson(event.serviceRecipientId));
      const evaluations = await r.evaluations(event.id), works = await r.works(event.id);
      const fact = await this.fact(r, await r.currentRelation(person.id));
      const result = evaluations[0]?.result;
      const readiness = fact ? 'READY' : result === 'NOT_APPLICABLE' ? 'NOT_REQUIRED' : result === 'DECISION_REQUIRED' ? 'DECISION_WAITING' : 'UNKNOWN';
      return { event, personSummary: person, requirementEvaluations: evaluations, works, readiness, deviceFact: fact, blockingUnknowns: result === 'DECISION_REQUIRED' ? ['会社PCの必要性を確認してください。'] : [], recentTimeline: await r.timeline(event.id) };
    });
  }
  workDetail(actor: Operator, workId: string) {
    return this.run(actor, async r => {
      const work = found(await r.work(workId)), event = found(await r.event(work.sourceEventId));
      const person = found(await r.recipientPerson(event.serviceRecipientId));
      const contract = found(await r.contract(work.contractProfileId));
      const why = found((await r.evaluations(event.id)).find(e=>e.id===work.sourceRequirementEvaluationId) ?? null);
      const fact = await this.fact(r,await r.currentRelation(person.id));
      const owner = await r.operator(work.workOwnerOperatorId);
      const changes = await Promise.all((await r.changes(workId)).map(async change=>({...change,device:found(await r.device(change.proposedEffectJson.deviceId)),evidence:await r.changeEvidence(change.id)})));
      return { work, ownerName: owner?.displayName ?? '担当者を確認してください', nextAction: work.nextAction, why, recipient: person, relevantFacts: fact ? [fact] : [], unknowns: fact ? [] : ['利用PCは未確認です。'], rules: [contract.configurationJson.requirements.COMPANY_PC], authority: contract.configurationJson.deviceAssignment, actions: await r.actions(workId), changes, timeline: await r.timeline(event.id) };
    });
  }
  personContext(actor: Operator, personId: string) {
    return this.run(actor, async r => {
      const person = found(await r.person(personId)), relations = await r.relations(personId), works = await r.personWorks(personId);
      const facts = await Promise.all(relations.filter(x=>x.status==='ACTIVE').map(x=>this.fact(r,x)));
      const events = [...new Set(works.map(w=>w.sourceEventId))];
      return { person, organization:found(await r.organization(person.organizationId)), currentRelations: relations.filter(x=>x.status==='ACTIVE'), relationHistory: relations, verifiedFacts: facts.filter(x=>x!==null), unknowns: facts.length ? [] : ['利用PCは未確認です。'], openWork: works.filter(w=>w.status!=='COMPLETED'), recentChanges: (await Promise.all(works.map(w=>r.changes(w.id)))).flat(), timeline: (await Promise.all(events.map(id=>r.timeline(id)))).flat().sort((a,b)=>Number(a.sequence)-Number(b.sequence)) };
    });
  }
  assignableDevices(actor: Operator) { return this.run(actor,r=>r.devices()); }
}
export type HomeView = Awaited<ReturnType<JoinQueries['home']>>;
export type JoinWorkspaceView = Awaited<ReturnType<JoinQueries['joinWorkspace']>>;
export type WorkDetailView = Awaited<ReturnType<JoinQueries['workDetail']>>;
export type PersonContextView = Awaited<ReturnType<JoinQueries['personContext']>>;
