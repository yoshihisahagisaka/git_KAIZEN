import {Router} from 'express';
import {z} from 'zod';
// Deployment-owned branding. Public manifest contains no account or customer data.
// A service slug is an app identity, never an authorization credential.
const schema=z.strictObject({slug:z.string().regex(/^[a-z0-9-]{1,48}$/),name:z.string().trim().min(1).max(80),shortName:z.string().trim().min(1).max(24)});
type Brand=z.infer<typeof schema>;
export function requestBrand(env:NodeJS.ProcessEnv):Brand{
 if(!env.FACTACT_REQUEST_PWA_BRAND_JSON)return {slug:'factact',name:'FACTACT 対応依頼',shortName:'FACTACT'};
 try{return schema.parse(JSON.parse(env.FACTACT_REQUEST_PWA_BRAND_JSON));}catch{throw Error('Invalid request PWA brand configuration');}
}
export function requestManifest(brand:Brand){
 return {id:'/portal/'+brand.slug,start_url:'/portal/'+brand.slug,scope:'/',name:brand.name,short_name:brand.shortName,lang:'ja',display:'standalone',background_color:'#f4f7f7',theme_color:'#006b73',icons:[{src:'/request-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]};
}
export function requestPwaRoutes(brand:Brand){
 const router=Router();
 router.get('/request-manifest.webmanifest',(_req,res)=>{res.set('Cache-Control','no-store').type('application/manifest+json').json(requestManifest(brand));});
 router.get('/request-brand',(_req,res)=>{res.set('Cache-Control','no-store').json(brand);});
 return router;
}
