do $$
declare n integer; c text;
begin
 select count(*),min(conname) into n,c from pg_constraint
 where conrelid='factact.support_work_lifecycle_events'::regclass and contype='c'
 and pg_get_constraintdef(oid) like '%kind%' and pg_get_constraintdef(oid) like '%OWNER_TRANSFERRED%';
 if n<>1 then raise exception 'support lifecycle kind constraint not uniquely identified'; end if;
 execute format('alter table factact.support_work_lifecycle_events drop constraint %I',c);
 alter table factact.support_work_lifecycle_events add check(kind in ('CONTINUATION_RECORDED','RESPONSE_RECORDED','WAITING_SET','RESUMED','NEXT_ACTION_CLEARED','REOPENED','OWNER_TRANSFERRED','ESCALATION_REQUESTED','ESCALATION_RESULT_RECORDED'));
end $$;
