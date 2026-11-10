import {describe,expect,it,vi} from 'vitest';
import {RegistryEditCommands,type RegistryEditStore} from '../../packages/application/src/registry-edit-commands.js';

const actor={tenantId:'10000000-0000-4000-8000-000000000001',
  actorOperatorId:'20000000-0000-4000-8000-000000000001'};
const proposal={serviceId:'60000000-0000-4000-8000-000000000001',
  personId:'40000000-0000-4000-8000-000000000001',
  requestId:'90000000-0000-4000-8000-000000000001',
  requestKey:'90000000-0000-4000-8000-000000000002',
  proposedDisplayName:'田中 太郎',reason:'登録表記訂正',expectedRegistryRevision:0};

describe('Registry Application interface',()=>{
  it('exposes only propose, verify and commit and validates before any store call',async()=>{
    const store:RegistryEditStore={propose:vi.fn().mockResolvedValue('change'),
      verify:vi.fn().mockResolvedValue('change'),commit:vi.fn().mockResolvedValue('change')};
    const command=new RegistryEditCommands(store);
    expect(command.kind).toBe('PERSON_DISPLAY_NAME_CORRECTION');
    expect(()=>command.proposeDisplayName(actor,{...proposal,proposedDisplayName:' '})).toThrow();
    expect(()=>command.proposeDisplayName(actor,{...proposal,expectedRegistryRevision:-1})).toThrow();
    expect(()=>command.verifyDisplayName(actor,proposal.requestId,'')).toThrow();
    expect(()=>command.commitDisplayName(actor,'fake-id')).toThrow();
    expect(store.propose).not.toHaveBeenCalled();
    expect(await command.proposeDisplayName(actor,proposal)).toEqual({changeId:'change'});
    expect(await command.verifyDisplayName(actor,proposal.requestId,'確認')).toEqual({changeId:'change'});
    expect(await command.commitDisplayName(actor,proposal.requestId)).toEqual({changeId:'change'});
  });
});
