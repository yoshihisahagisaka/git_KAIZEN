import {describe,it,expect} from 'vitest';
import {loadTeamsDeployment} from '../../apps/web/src/server/request-teams-config.js';
import {randomUUID} from 'node:crypto';
describe('Teams deployment configuration',()=>{
 it('is disabled unless explicitly enabled',()=>{
  expect(loadTeamsDeployment({},'https://factact.example.invalid').enabled).toBe(false);
 });
 it('maps only the exact configured service and contract',()=>{
  const tenantId=randomUUID(),serviceId=randomUUID(),contractProfileId=randomUUID(),endpoint='https://synthetic.logic.azure.com/workflow';
  const env={FACTACT_TEAMS_SEND_ENABLED:'true',FACTACT_TEAMS_ENDPOINTS_JSON:JSON.stringify([{tenantId,serviceId,contractProfileId,endpoint}])};
  const cfg=loadTeamsDeployment(env,'https://factact.example.invalid');
  expect(cfg.endpointFor(tenantId,serviceId,contractProfileId)).toBe(endpoint);
  expect(cfg.endpointFor(tenantId,serviceId,randomUUID())).toBeUndefined();
  expect(()=>loadTeamsDeployment({...env,FACTACT_TEAMS_ENDPOINTS_JSON:'secret-invalid'},'https://factact.example.invalid')).toThrow('Invalid Teams deployment configuration');
 });
});
