begin;

do $$
declare c text; n integer;
begin
 select count(*), min(conname) into n,c from pg_constraint where conrelid='factact.support_work_records'::regclass and contype='c' and pg_get_constraintdef(oid) like '%kind%' and pg_get_constraintdef(oid) like '%CONTINUATION%';
 if n<>1 then raise exception 'support_work_records kind constraint not uniquely identified'; end if;
 execute format('alter table factact.support_work_records drop constraint %I',c);
 alter table factact.support_work_records add check(kind in ('DRAFT','COMPLETION','CORRECTION','CONTINUATION','RESPONSE'));

 select count(*), min(conname) into n,c from pg_constraint where conrelid='factact.support_work_lifecycle_events'::regclass and contype='c' and pg_get_constraintdef(oid) like '%kind%' and pg_get_constraintdef(oid) like '%NEXT_ACTION_CLEARED%';
 if n<>1 then raise exception 'support_work_lifecycle_events kind constraint not uniquely identified'; end if;
 execute format('alter table factact.support_work_lifecycle_events drop constraint %I',c);
 alter table factact.support_work_lifecycle_events add check(kind in ('CONTINUATION_RECORDED','RESPONSE_RECORDED','WAITING_SET','RESUMED','NEXT_ACTION_CLEARED','REOPENED'));

 alter table factact.support_work_close_decisions add column close_sequence integer not null default 1 check(close_sequence>0);
 select count(*), min(conname) into n,c
 from pg_constraint
 where conrelid='factact.support_work_close_decisions'::regclass and contype='u'
   and cardinality(conkey)=2
   and conkey @> array[
     (select attnum from pg_attribute where attrelid='factact.support_work_close_decisions'::regclass and attname='tenant_id'),
     (select attnum from pg_attribute where attrelid='factact.support_work_close_decisions'::regclass and attname='work_id')
   ]::smallint[];
 if n<>1 then raise exception 'support_work_close_decisions tenant/work unique constraint not uniquely identified'; end if;
 execute format('alter table factact.support_work_close_decisions drop constraint %I',c);
 alter table factact.support_work_close_decisions add unique(tenant_id,work_id,close_sequence);

 select count(*), min(conname) into n,c from pg_constraint where conrelid='factact.work'::regclass and contype='c' and pg_get_constraintdef(oid) like '%waiting_party%' and pg_get_constraintdef(oid) like '%waiting_reason%';
 if n<>1 then raise exception 'work waiting constraint not uniquely identified'; end if;
 execute format('alter table factact.work drop constraint %I',c);
 alter table factact.work add check(
   (waiting=false and waiting_party is null and waiting_reason is null)
   or (waiting=true and ((waiting_party is null and waiting_reason is null) or (waiting_party is not null and waiting_reason is not null and length(trim(waiting_party))>0 and length(trim(waiting_reason))>0)))
 );

 select count(*), min(conname) into n,c from pg_constraint where conrelid='factact.support_work_target_observations'::regclass and contype='c' and pg_get_constraintdef(oid) like '%kind%' and pg_get_constraintdef(oid) like '%IDENTIFICATION%' and pg_get_constraintdef(oid) not like '%value%';
 if n<>1 then raise exception 'support target observation kind constraint not uniquely identified'; end if;
 execute format('alter table factact.support_work_target_observations drop constraint %I',c);
 alter table factact.support_work_target_observations add check(kind in ('IDENTIFICATION','OWNERSHIP','MANAGEMENT_STATE','REGISTRY_COMPARISON','CALLER_STATEMENT'));

 select count(*), min(conname) into n,c from pg_constraint where conrelid='factact.support_work_target_observations'::regclass and contype='c' and pg_get_constraintdef(oid) like '%value%' and pg_get_constraintdef(oid) like '%PARTIALLY_IDENTIFIED%' and pg_get_constraintdef(oid) not like '%kind%';
 if n<>1 then raise exception 'support target observation value constraint not uniquely identified'; end if;
 execute format('alter table factact.support_work_target_observations drop constraint %I',c);
 alter table factact.support_work_target_observations add check(value in ('UNIDENTIFIED','PARTIALLY_IDENTIFIED','PERSONALLY_OWNED','COMPANY_OWNED','MANAGED','UNMANAGED','MATCH','DIFFERENT','UNKNOWN'));

 select count(*), min(conname) into n,c from pg_constraint where conrelid='factact.support_work_target_observations'::regclass and contype='c' and pg_get_constraintdef(oid) like '%kind%' and pg_get_constraintdef(oid) like '%value%' and pg_get_constraintdef(oid) like '%MANAGEMENT_STATE%';
 if n<>1 then raise exception 'support target observation combination constraint not uniquely identified'; end if;
 execute format('alter table factact.support_work_target_observations drop constraint %I',c);
 alter table factact.support_work_target_observations add check(
   (kind='IDENTIFICATION' and value in ('UNIDENTIFIED','PARTIALLY_IDENTIFIED','UNKNOWN')) or
   (kind='OWNERSHIP' and value in ('PERSONALLY_OWNED','COMPANY_OWNED','UNKNOWN')) or
   (kind='MANAGEMENT_STATE' and value in ('MANAGED','UNMANAGED','UNKNOWN')) or
   (kind='REGISTRY_COMPARISON' and value in ('MATCH','DIFFERENT','UNKNOWN') and source_type='OPERATOR') or
   (kind='CALLER_STATEMENT' and value='UNKNOWN' and source_type='CALLER' and length(trim(detail))>0)
 );

 alter table factact.support_work_target_observations add column source_snapshot jsonb not null default '{}'::jsonb;
 alter table factact.support_work_target_observations add check(jsonb_typeof(source_snapshot)='object');
end $$;

commit;
