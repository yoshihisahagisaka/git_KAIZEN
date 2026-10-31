import type { Pool, PoolClient } from 'pg';
import type { Operator } from '../../../../../packages/domain/src/operator.js';
import type { ExploreSearchRepository, ExploreSearchRow, ExploreSearchUnitOfWork } from '../../../../../packages/application/src/explore-ports.js';
import { withTenant } from './database.js';

export class PgExploreSearchUnitOfWork implements ExploreSearchUnitOfWork {
  constructor(private readonly pool: Pool) {}
  run<T>(tenantId: string, work: (repository: ExploreSearchRepository) => Promise<T>, readOnly = false) {
    return withTenant(this.pool,tenantId,client=>work(new PgExploreSearchRepository(client)),readOnly);
  }
}

class PgExploreSearchRepository implements ExploreSearchRepository {
  constructor(private readonly db: PoolClient) {}
  private async rows(sql: string, values: unknown[]): Promise<ExploreSearchRow[]> {
    return (await this.db.query<ExploreSearchRow>(sql,values)).rows.map(row=>Object.fromEntries(Object.entries(row).filter(([,value])=>value!==null)) as unknown as ExploreSearchRow);
  }
  operator(id: string) {
    return this.db.query<Operator>(`select o.id,o.tenant_id as "tenantId",o.display_name as "displayName",t.name as "tenantName",
      array(select role from factact.operator_roles r where r.operator_id=o.id and r.tenant_id=o.tenant_id) as roles
      from factact.operators o join factact.tenants t on t.id=o.tenant_id
      where o.id=$1 and o.status='ACTIVE' and t.status='ACTIVE'`,[id]).then(result=>result.rows[0]??null);
  }
  organizations(query: string, limit: number) { return this.rows(`select 'ORGANIZATION' as "resultType",id as "entityId",name as "primaryLabel",
      case when lower(name)=lower($1) then 0 when strpos(lower(name),lower($1))=1 then 1 else 2 end as "matchRank"
      from factact.organizations where strpos(lower(name),lower($1))>0
      order by "matchRank",lower(name),id limit $2`,[query,limit]); }
  people(query: string, limit: number) { return this.rows(`select 'PERSON' as "resultType",id as "entityId",display_name as "primaryLabel",
      email as "secondaryLabel",jsonb_build_object('organizationId',organization_id) as metadata,
      least(case when lower(display_name)=lower($1) then 0 when strpos(lower(display_name),lower($1))=1 then 1 when strpos(lower(display_name),lower($1))>0 then 2 else 3 end,
            case when lower(coalesce(email,''))=lower($1) then 0 when strpos(lower(coalesce(email,'')),lower($1))=1 then 1 when strpos(lower(coalesce(email,'')),lower($1))>0 then 2 else 3 end) as "matchRank"
      from factact.people where strpos(lower(display_name),lower($1))>0 or strpos(lower(coalesce(email,'')),lower($1))>0
      order by "matchRank",lower(display_name),id limit $2`,[query,limit]); }
  devices(query: string, limit: number) { return this.rows(`select 'DEVICE' as "resultType",id as "entityId",asset_tag as "primaryLabel",
      display_name as "secondaryLabel",jsonb_strip_nulls(jsonb_build_object('serialNumber',serial_number,'deviceStatus',device_status)) as metadata,
      least(case when lower(asset_tag)=lower($1) then 0 when strpos(lower(asset_tag),lower($1))=1 then 1 when strpos(lower(asset_tag),lower($1))>0 then 2 else 3 end,
            case when lower(coalesce(serial_number,''))=lower($1) then 0 when strpos(lower(coalesce(serial_number,'')),lower($1))=1 then 1 when strpos(lower(coalesce(serial_number,'')),lower($1))>0 then 2 else 3 end,
            case when lower(display_name)=lower($1) then 0 when strpos(lower(display_name),lower($1))=1 then 1 when strpos(lower(display_name),lower($1))>0 then 2 else 3 end) as "matchRank"
      from factact.devices where strpos(lower(asset_tag),lower($1))>0 or strpos(lower(coalesce(serial_number,'')),lower($1))>0 or strpos(lower(display_name),lower($1))>0
      order by "matchRank",lower(asset_tag),id limit $2`,[query,limit]); }
  services(query: string, limit: number) { return this.rows(`select 'SERVICE' as "resultType",id as "entityId",name as "primaryLabel",
      jsonb_build_object('organizationId',organization_id) as metadata,
      case when lower(name)=lower($1) then 0 when strpos(lower(name),lower($1))=1 then 1 else 2 end as "matchRank"
      from factact.services where strpos(lower(name),lower($1))>0
      order by "matchRank",lower(name),id limit $2`,[query,limit]); }
  work(query: string, exactId: string | null, limit: number) { return this.rows(`select 'WORK' as "resultType",id as "entityId",title as "primaryLabel",
      status as "secondaryLabel",jsonb_build_object('status',status,'lane',lane,'updatedAt',updated_at) as metadata,
      case when id=$2::uuid then 0 when lower(title)=lower($1) then 0 when strpos(lower(title),lower($1))=1 then 1 else 2 end as "matchRank"
      from factact.work where ($2::uuid is not null and id=$2::uuid) or strpos(lower(title),lower($1))>0
      order by "matchRank",lower(title),id limit $3`,[query,exactId,limit]); }
  knowledgeCandidates(query: string, limit: number) { return this.rows(`select 'KNOWLEDGE_CANDIDATE' as "resultType",id as "entityId",title as "primaryLabel",
      topic as "secondaryLabel",jsonb_build_object('topic',topic,'sourceWorkId',source_work_id,'createdAt',created_at) as metadata,
      least(case when lower(title)=lower($1) then 0 when strpos(lower(title),lower($1))=1 then 1 when strpos(lower(title),lower($1))>0 then 2 else 3 end,
            case when lower(content_text)=lower($1) then 0 when strpos(lower(content_text),lower($1))=1 then 1 when strpos(lower(content_text),lower($1))>0 then 2 else 3 end,
            case when lower(topic)=lower($1) then 0 when strpos(lower(topic),lower($1))=1 then 1 when strpos(lower(topic),lower($1))>0 then 2 else 3 end) as "matchRank"
      from factact.knowledge_candidates where strpos(lower(title),lower($1))>0 or strpos(lower(content_text),lower($1))>0 or strpos(lower(topic),lower($1))>0
      order by "matchRank",lower(title),id limit $2`,[query,limit]); }
}
