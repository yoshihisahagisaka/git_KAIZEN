import type {Config} from './config.js';

/** The worker has no OIDC client secret or session-minter credential.
 * Use the same runtime TLS/loopback proxy restrictions as the web app. */
export function loadPushWorkerDatabase(env:NodeJS.ProcessEnv):Pick<Config,'databaseUrl'|'databaseSsl'|'databaseLocalProxy'>{
 const databaseUrl=env.DATABASE_URL;
 const mode=env.DATABASE_CONNECTION_MODE??'direct';
 const ssl=env.DATABASE_SSL??'true';
 if(!databaseUrl||!['direct','local-proxy'].includes(mode)||!['true','false'].includes(ssl))
  throw Error('Invalid push worker database configuration');
 let u:URL;
 try{u=new URL(databaseUrl);}catch{throw Error('Invalid push worker database configuration');}
 if(!['postgres:','postgresql:'].includes(u.protocol)||u.username!=='factact_runtime'||!u.password||
    ['sslmode','sslcert','sslkey','sslrootcert'].some(k=>u.searchParams.has(k)))
  throw Error('Invalid push worker database configuration');
 const proxy=mode==='local-proxy';
 if(proxy?(ssl!=='false'||u.hostname!=='127.0.0.1'||!u.port||!!u.search||!!u.hash):ssl!=='true')
  throw Error('Invalid push worker database TLS configuration');
 return {databaseUrl,databaseSsl:ssl==='true',...(proxy?{databaseLocalProxy:true as const}:{})};
}
