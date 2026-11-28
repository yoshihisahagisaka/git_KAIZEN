import {normalizePhone} from './contact-match.js';

export interface CtiReceptionHint {
 phone:string;
 kind:'NUMBER'|'UNKNOWN';
}

/** An incoming number is an unverified search hint.
 * It must never establish identity, membership or authority.
 */
export function parseCtiReception(
 search:string
):CtiReceptionHint {
 if(search.length>512)
  return {phone:'',kind:'UNKNOWN'};

 const query=new URLSearchParams(search);
 const values=query.getAll('tel');

 if(values.length!==1||values[0]!.length>80)
  return {phone:'',kind:'UNKNOWN'};

 const phone=normalizePhone(values[0]!);

 return phone
  ?{phone,kind:'NUMBER'}
  :{phone:'',kind:'UNKNOWN'};
}
