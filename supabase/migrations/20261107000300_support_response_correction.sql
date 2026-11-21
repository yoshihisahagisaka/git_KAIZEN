-- An external Actor may attest to a corrected text without rewriting the
-- original response, its disposition, Follow-up, lifecycle or Close Decision.
do $$
declare n integer; c text;
begin
 select count(*),min(conname) into n,c from pg_constraint
 where conrelid='factact.support_work_records'::regclass and contype='c'
  and pg_get_constraintdef(oid) like '%kind%'
  and pg_get_constraintdef(oid) like '%CONTINUATION%'
  and pg_get_constraintdef(oid) like '%RESPONSE%';
 if n<>1 then raise exception 'support_work_records kind constraint not uniquely identified'; end if;
 execute format('alter table factact.support_work_records drop constraint %I',c);
end $$;
alter table factact.support_work_records add constraint support_work_records_kind_with_response_correction
 check(kind in ('DRAFT','COMPLETION','CORRECTION','CONTINUATION','RESPONSE','RESPONSE_CORRECTION'));
alter table factact.support_work_records add constraint support_response_correction_content_check
 check(kind<>'RESPONSE_CORRECTION' or (
  length(trim(correction_reason)) between 1 and 1000
  and jsonb_typeof(notes->'responseText')='string'
  and length(trim(notes->>'responseText')) between 1 and 4000
  and jsonb_typeof(notes->'supersedesRecordId')='string'
  and (notes->>'supersedesRecordId') ~ '^[a-f0-9-]{36}$'
 ));
