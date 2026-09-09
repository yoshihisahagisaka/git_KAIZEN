import type { Operator } from '../../domain/src/operator.js';
import type { Action, Audit, Change, Contract, Device, Evaluation, Evidence, JoinEvent, Person, Relation, Service, Work } from '../../domain/src/join.js';

export interface JoinRepository {
  operator(id: string): Promise<Operator | null>;
  person(id: string, lock?: boolean): Promise<Person | null>;
  service(id: string): Promise<Service | null>;
  effectiveContracts(serviceId: string, at: string): Promise<Contract[]>;
  contract(id: string): Promise<Contract | null>;
  ensureRecipient(id: string, serviceId: string, personId: string): Promise<string>;
  recipientPerson(recipientId: string): Promise<Person | null>;
  insertEvent(event: JoinEvent): Promise<void>;
  event(id: string, lock?: boolean): Promise<JoinEvent | null>;
  evaluations(eventId: string): Promise<Evaluation[]>;
  insertEvaluation(evaluation: Evaluation): Promise<void>;
  markEvaluated(eventId: string): Promise<void>;
  insertWork(work: Work): Promise<void>;
  work(id: string, lock?: boolean): Promise<Work | null>;
  saveWorkProgress(work: Work): Promise<void>;
  works(eventId: string): Promise<Work[]>;
  device(id: string, lock?: boolean): Promise<Device | null>;
  deviceRelation(deviceId: string): Promise<Relation | null>;
  currentRelation(personId: string): Promise<Relation | null>;
  insertAction(action: Action, deviceId: string): Promise<void>;
  action(id: string): Promise<Action | null>;
  actions(workId: string): Promise<Action[]>;
  insertChange(change: Change): Promise<void>;
  change(id: string, lock?: boolean): Promise<Change | null>;
  changes(workId: string): Promise<Change[]>;
  saveChangeReview(change: Change): Promise<void>;
  endRelation(id: string, at: string): Promise<void>;
  insertRelation(relation: Relation): Promise<void>;
  relationForChange(changeId: string): Promise<Relation | null>;
  insertEvidence(evidence: Evidence, changeId: string): Promise<void>;
  evidence(id: string): Promise<Evidence | null>;
  changeEvidence(changeId: string): Promise<Evidence[]>;
  organization(id: string): Promise<{id:string;name:string} | null>;
  linkEvidence(id: string, changeId: string): Promise<void>;
  appendAudit(audit: Audit): Promise<void>;
  timeline(eventId: string): Promise<Audit[]>;
  people(): Promise<Person[]>;
  services(): Promise<Service[]>;
  events(): Promise<JoinEvent[]>;
  devices(): Promise<Device[]>;
  relations(personId: string): Promise<Relation[]>;
  personWorks(personId: string): Promise<Work[]>;
}
export interface JoinUnitOfWork {
  run<T>(tenantId: string, fn: (repo: JoinRepository) => Promise<T>, readOnly?: boolean): Promise<T>;
}
export interface JoinRuntime { id(): string; now(): string }
