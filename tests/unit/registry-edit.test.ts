import {describe,expect,it} from 'vitest';
import {
  FIRST_REGISTRY_CHANGE_KIND,FIRST_REGISTRY_REVIEW_POLICY,
  isDistinctRegistryReviewer,registryTransitionOperation,validDisplayNameCorrection,
} from '../../packages/domain/src/registry-edit.js';

const valid={originalDisplayName:'旧 表示名',proposedDisplayName:'新 表示名',expectedRegistryRevision:0,reason:'本人申告との相違を確認'};

describe('first Registry edit contract',()=>{
  it('uses a separate explicit Grant operation for each backend transition',()=>{
    expect(FIRST_REGISTRY_CHANGE_KIND).toBe('PERSON_DISPLAY_NAME_CORRECTION');
    expect(FIRST_REGISTRY_REVIEW_POLICY).toBe('PERSON_DISPLAY_NAME_DUAL_CONTROL_V1');
    expect(registryTransitionOperation).toEqual({PROPOSE:'UPDATE',VERIFY:'REVIEW',COMMIT:'APPROVE'});
  });
  it('requires a distinct Actor for review and commit without granting authority',()=>{
    expect(isDistinctRegistryReviewer('proposer','reviewer')).toBe(true);
    expect(isDistinctRegistryReviewer('proposer','proposer')).toBe(false);
    expect(isDistinctRegistryReviewer('','reviewer')).toBe(false);
  });
  it('rejects empty, unchanged, oversized or stale/malformed corrections',()=>{
    expect(validDisplayNameCorrection(valid)).toBe(true);
    expect(validDisplayNameCorrection({...valid,proposedDisplayName:'旧 表示名'})).toBe(false);
    expect(validDisplayNameCorrection({...valid,proposedDisplayName:'  '})).toBe(false);
    expect(validDisplayNameCorrection({...valid,proposedDisplayName:'x'.repeat(201)})).toBe(false);
    expect(validDisplayNameCorrection({...valid,reason:''})).toBe(false);
    expect(validDisplayNameCorrection({...valid,expectedRegistryRevision:-1})).toBe(false);
    expect(validDisplayNameCorrection({...valid,expectedRegistryRevision:1.1})).toBe(false);
  });
});
