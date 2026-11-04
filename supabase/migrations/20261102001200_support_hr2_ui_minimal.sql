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
 alter table factact.support_work_lifecycle_events add check(kind in ('CONTINUATION_RECORDED','RESPONSE_RECORDED','WAITING_SET','RESUMED','NEXT_ACTION_CLEARED'));

 select count(*), min(conname) into n,c from pg_constraint where conrelid='factact.work'::regclass and contype='c' and pg_get_constraintdef(oid) like '%waiting_party%' and pg_get_constraintdef(oid) like '%waiting_reason%';
 if n<>1 then raise exception 'work waiting constraint not uniquely identified'; end if;
 execute format('alter table factact.work drop constraint %I',c);
 alter table factact.work add check(
   (waiting=false and waiting_party is null and waiting_reason is null)
   or (waiting=true and ((waiting_party is null and waiting_reason is null) or (waiting_party is not null and waiting_reason is not null and length(trim(waiting_party))>0 and length(trim(waiting_reason))>0)))
 );
end $$;

commit;
