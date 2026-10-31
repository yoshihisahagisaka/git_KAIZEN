import { z } from 'zod';
import type { Operator } from '../../domain/src/operator.js';
import { assertRole, found } from '../../domain/src/join.js';
import { exploreSearchTypes, type ExploreSearchResult, type ExploreSearchType, type ExploreSearchUnitOfWork } from './explore-ports.js';

export interface ExploreSearchQuery { query: string; types?: ExploreSearchType[]; limit: number }

export class ExploreQueries {
  constructor(private readonly uow: ExploreSearchUnitOfWork) {}

  search(actor: Operator, input: ExploreSearchQuery) {
    return this.uow.run(actor.tenantId, async repository => {
      assertRole(found(await repository.operator(actor.id)), ['ADMIN','OPERATOR','REVIEWER']);
      const selected = new Set(input.types ?? exploreSearchTypes);
      const exactId = z.uuid().safeParse(input.query).success ? input.query : null;
      const groups = await Promise.all([
        selected.has('ORGANIZATION') ? repository.organizations(input.query,input.limit) : [],
        selected.has('PERSON') ? repository.people(input.query,input.limit) : [],
        selected.has('DEVICE') ? repository.devices(input.query,input.limit) : [],
        selected.has('SERVICE') ? repository.services(input.query,input.limit) : [],
        selected.has('WORK') ? repository.work(input.query,exactId,input.limit) : [],
        selected.has('KNOWLEDGE_CANDIDATE') ? repository.knowledgeCandidates(input.query,input.limit) : [],
      ]);
      const order = new Map<ExploreSearchType,number>(exploreSearchTypes.map((type,index)=>[type,index]));
      const results: ExploreSearchResult[] = groups.flat().sort((a,b)=>a.matchRank-b.matchRank
        || (order.get(a.resultType)??0)-(order.get(b.resultType)??0)
        || a.primaryLabel.localeCompare(b.primaryLabel,'ja')
        || a.entityId.localeCompare(b.entityId)).slice(0,input.limit).map(({matchRank:_,...result})=>result);
      return { results };
    },true);
  }
}
