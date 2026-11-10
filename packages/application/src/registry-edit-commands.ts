import {z} from 'zod';
import {FIRST_REGISTRY_CHANGE_KIND} from '../../domain/src/registry-edit.js';

/** Actor/Tenant come from the verified server session, never a Caller payload. */
export interface VerifiedRegistryActor {tenantId:string;actorOperatorId:string}
export interface ProposeDisplayNameInput {
  serviceId:string;personId:string;requestId:string;requestKey:string;
  proposedDisplayName:string;reason:string;expectedRegistryRevision:number;
}

/** Persistence owns the transaction, exact Grant resolution and Commit lock. */
export interface RegistryEditStore {
  propose(actor:VerifiedRegistryActor,input:ProposeDisplayNameInput):Promise<string>;
  verify(actor:VerifiedRegistryActor,changeId:string,summary:string):Promise<string>;
  commit(actor:VerifiedRegistryActor,changeId:string):Promise<string>;
  confirm(actor:VerifiedRegistryActor,changeId:string,summary:string):Promise<string>;
}

const uuid=z.uuid();
const guardedActor=(actor:VerifiedRegistryActor):void=>{
  uuid.parse(actor.tenantId);uuid.parse(actor.actorOperatorId);
};
const trimmedLength=(value:unknown,min:number,max:number):boolean=>
  typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max;

/** Command boundary only. No Work, Action, synthetic identity or UI state. */
export class RegistryEditCommands {
  readonly kind=FIRST_REGISTRY_CHANGE_KIND;
  constructor(private readonly store:RegistryEditStore){}

  proposeDisplayName(actor:VerifiedRegistryActor,input:ProposeDisplayNameInput):Promise<{changeId:string}> {
    guardedActor(actor);
    for(const id of [input.serviceId,input.personId,input.requestId,input.requestKey])uuid.parse(id);
    if(!trimmedLength(input.proposedDisplayName,1,200)||!trimmedLength(input.reason,1,1000)
      ||!Number.isSafeInteger(input.expectedRegistryRevision)||input.expectedRegistryRevision<0)
      throw Error('INVALID_REGISTRY_DISPLAY_NAME_PROPOSAL');
    return this.store.propose(actor,input).then(changeId=>({changeId}));
  }

  verifyDisplayName(actor:VerifiedRegistryActor,changeId:string,summary:string):Promise<{changeId:string}> {
    guardedActor(actor);uuid.parse(changeId);
    if(!trimmedLength(summary,1,1000))throw Error('REGISTRY_VERIFICATION_EVIDENCE_REQUIRED');
    return this.store.verify(actor,changeId,summary).then(id=>({changeId:id}));
  }

  commitDisplayName(actor:VerifiedRegistryActor,changeId:string):Promise<{changeId:string}> {
    guardedActor(actor);uuid.parse(changeId);
    return this.store.commit(actor,changeId).then(id=>({changeId:id}));
  }

  /** One human confirm action, two separate DB state transitions in one ACID
   * transaction. The attestation describes a screen review, not legal identity
   * verification or independently observed facts. */
  confirmDisplayName(actor:VerifiedRegistryActor,changeId:string):Promise<{changeId:string}> {
    guardedActor(actor);uuid.parse(changeId);
    const summary='表示された登録表記の訂正前後と依頼理由を確認して確定した。独立した本人確認を行ったことは示さない。';
    return this.store.confirm(actor,changeId,summary).then(id=>({changeId:id}));
  }
}
