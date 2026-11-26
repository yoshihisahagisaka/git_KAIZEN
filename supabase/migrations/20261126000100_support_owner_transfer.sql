-- Extend existing append-only lifecycle, not a new transfer object.
do $$
declare n integer; c text;
begin
 select count(*),min(conname) into n,c from pg_constraint
 where conrelid='factact.support_work_lifecycle_events'::regclass and contype='c'
 and pg_get_constraintdef(oid) like '%kind%' and pg_get_constraintdef(oid) like '%REOPENED%';
 if n<>1 then raise exception 'support lifecycle kind constraint not uniquely identified'; end if;
 execute format('alter table factact.support_work_lifecycle_events drop constraint %I',c);
 alter table factact.support_work_lifecycle_events add check(kind in ('CONTINUATION_RECORDED','RESPONSE_RECORDED','WAITING_SET','RESUMED','NEXT_ACTION_CLEARED','REOPENED','OWNER_TRANSFERRED'));
end $$;
grant update(work_owner_operator_id,next_action_owner_operator_id) on factact.work to factact_runtime;
