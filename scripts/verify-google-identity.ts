// One-shot local administration. Uses the production Google verifier, but grants
// no application session, Operator binding or domain access.
import express from 'express';
import cookieParser from 'cookie-parser';
import { writeFile } from 'node:fs/promises';
import { loadConfig } from '../apps/web/src/server/config.js';
import { createGoogleProvider } from '../apps/web/src/server/auth/oidc.js';
import { generateOpaqueValue, generateCodeVerifier } from '../apps/web/src/server/auth/pkce.js';

async function main() {
  const config = loadConfig(process.env);
  if (config.nodeEnv !== 'development' || config.origin !== 'http://localhost:5173' || config.redirectUri !== 'http://localhost:5173/auth/callback') throw new Error('Only the documented localhost development callback is allowed');
  const provider = await createGoogleProvider(config);
  const app = express(); app.disable('x-powered-by'); app.use(cookieParser());
  let pending: {cookie:string;expires:number;state:string;nonce:string;verifier:string} | undefined;
  app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'");next();});
  app.get('/',(_req,res)=>res.send('<h1>FACTACT local identity verification</h1><p>This verifies your Google identity only. It does not grant application access.</p><a href="/auth/login">Verify my Google account</a>'));
  app.get('/auth/login',(_req,res)=>{
    pending={cookie:generateOpaqueValue(),expires:Date.now()+600000,state:generateOpaqueValue(),nonce:generateOpaqueValue(),verifier:generateCodeVerifier()};
    res.cookie('factact_local_identity',pending.cookie,{httpOnly:true,sameSite:'lax',path:'/',maxAge:600000});
    res.redirect(provider.authorizationUrl(pending));
  });
  app.get('/auth/callback',async(req,res)=>{
    const login=pending;
    if (!login || req.cookies?.factact_local_identity!==login.cookie || Date.now()>login.expires) {res.status(400).send('Verification expired or browser did not match. Start again.');return;}
    pending=undefined;
    res.clearCookie('factact_local_identity',{path:'/'});
    try {
      const callback=new URL(config.redirectUri); callback.search=new URL(req.originalUrl,config.origin).search;
      const identity=await provider.verifyCallback(callback,login);
      await writeFile('.env.google-identity.json',JSON.stringify({...identity,verifiedAt:new Date().toISOString()},null,2),{mode:0o600});
      console.log('Google signature, issuer, state, nonce and PKCE verified. Issuer/sub saved locally; no tokens saved. No Operator binding or session created.');
      res.send('<h1>Google identity verified</h1><p>You may close this tab. Continue with explicit local Operator binding, then start FACTACT and sign in again.</p>');
      server.close(); clearTimeout(expiry);
    } catch {res.status(401).send('Google identity verification failed. Start again.');}
  });
  const server=app.listen(5173,'localhost',()=>console.log('Open http://localhost:5173 in your normal browser and select Verify my Google account. Waiting up to 10 minutes.'));
  server.on('error',()=>{console.error('Cannot listen on localhost:5173. Stop the UI server before verification.');process.exitCode=1;clearTimeout(expiry);});
  const expiry=setTimeout(()=>{pending=undefined;server.close();console.log('Local identity verification stopped.');},600000);
}
main().catch(()=>{console.error('Cannot start Google verification. Check local OAuth configuration and network access.');process.exitCode=1;});
