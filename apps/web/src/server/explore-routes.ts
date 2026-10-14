import { Router } from 'express';
import { z } from 'zod';
import type { Operator } from '../../../../packages/domain/src/operator.js';
import { exploreSearchTypes } from '../../../../packages/application/src/explore-ports.js';
import type { ExploreQueries } from '../../../../packages/application/src/explore-queries.js';

export interface ExploreServices { queries: ExploreQueries }

const type = z.enum(exploreSearchTypes);
const query = z.strictObject({
  q: z.string().trim().min(1).max(200),
  types: z.string().transform(value=>value.split(',').map(item=>item.trim())).pipe(z.array(type).min(1)).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function exploreRoutes({queries}: ExploreServices) {
  const router=Router();
  const actor=(locals:Record<string,unknown>)=>(locals.session as {operator:Operator}).operator;
  router.get('/explore/search',async(req,res)=>{
    const input=query.parse(req.query);
    res.json({ok:true,data:await queries.search(actor(res.locals),{query:input.q,limit:input.limit,...(input.types?{types:[...new Set(input.types)]}:{})}),warnings:[]});
  });
  return router;
}
