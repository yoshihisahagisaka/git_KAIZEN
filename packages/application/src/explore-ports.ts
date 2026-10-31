import type { Operator } from '../../domain/src/operator.js';

export const exploreSearchTypes = ['ORGANIZATION','PERSON','DEVICE','SERVICE','WORK','KNOWLEDGE_CANDIDATE'] as const;
export type ExploreSearchType = typeof exploreSearchTypes[number];

export interface ExploreSearchResult {
  resultType: ExploreSearchType;
  entityId: string;
  primaryLabel: string;
  secondaryLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface ExploreSearchRow extends ExploreSearchResult { matchRank: number }

export interface ExploreSearchRepository {
  operator(id: string): Promise<Operator | null>;
  organizations(query: string, limit: number): Promise<ExploreSearchRow[]>;
  people(query: string, limit: number): Promise<ExploreSearchRow[]>;
  devices(query: string, limit: number): Promise<ExploreSearchRow[]>;
  services(query: string, limit: number): Promise<ExploreSearchRow[]>;
  work(query: string, exactId: string | null, limit: number): Promise<ExploreSearchRow[]>;
  knowledgeCandidates(query: string, limit: number): Promise<ExploreSearchRow[]>;
}

export interface ExploreSearchUnitOfWork {
  run<T>(tenantId: string, work: (repository: ExploreSearchRepository) => Promise<T>, readOnly?: boolean): Promise<T>;
}
