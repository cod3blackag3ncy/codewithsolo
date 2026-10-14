// CodeWithSolo / Cod3BlackAgency — project inquiry delivery.
// Success means Resend accepted the internal notification; not a completed sale.
import { randomUUID } from 'node:crypto';
const SERVICES = Object.freeze({launch:'Launch site',system:'Business operations system',repair:'Website / customer-flow repair',automation:'Business automation',unsure:'Help diagnosing the problem'});
const MGMT = Object.freeze({self:'Client / team manages',managed:'Wants ongoing managed support',unsure:'Discuss during discovery'});
const BUDGETS = new Set(['','under1k','1k-3k','3k-5k','5k-10k','10k+']);
const TIMELINES = new Set(['rush','standard','flexible']);
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MAX_BYTES=14000;
const FROM='CodeWithSolo <noreply@mail.codewithsolo.com>';
const TO=process.env.INQUIRY_NOTIFY_TO || 'cod3blackagency@gmail.com';
const recent=new Map(); // Best-effort process-local dedupe, not a durable rate limit.
function json(res,status,body){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');return res.status(status).json(body)}
function clean(value,max=200){return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):''}
function html(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function parseInput(b){
 const name=clean(b.name,100),email=clean(b.email,254).toLowerCase(),business=clean(b.business,140),website=clean(b.website,200),vision=clean(b.vision,2000);
 const service=clean(b.service,50),management=clean(b.management,30)||'unsure',budget=clean(b.budget,15),timeline=clean(b.timeline,15)||'flexible';
 if(clean(b.company_fax,50))return {silent:true};
 if(b.consent!==true)return {error:'Consent is required to submit an inquiry.'};
 if(name.length<2)return {error:'Please provide your name.'};
 if(!EMAIL_RE.test(email))return {error:'Please provide a valid email address.'};
 if(!SERVICES[service])return {error:'Please choose the type of help needed.'};
 if(vision.length<15)return {error:'Please describe the business problem in a little more detail.'};
 if(!MGMT[management]||!BUDGETS.has(budget)||!TIMELINES.has(timeline))return {error:'Please select valid project options.'};
 if(website&&(!/^(https?:\/\/)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#].*)?$/i.test(website)||/[\s<>]/.test(website)))return {error:'Please check the website address or leave it blank.'};
 return {data:{name,email,business,website,vision,service,management,budget,timeline}};
}
async function send(payload,key){
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(11000)});
 const result=await response.json().catch(()=>({}));return {ok:response.ok&&!!result.id,status:response.status};
}
function emailMarkup(title,body){
 return '<!doctype html><html><body style="margin:0;padding:32px 18px;background:#101713;color:#f2f4ec;font:15px/1.7 Arial,sans-serif"><div style="max-width:620px;margin:auto;border:1px solid #415842;border-radius:12px;padding:28px;background:#1a251c">'
 +'<div style="color:#c2fc83;font-size:12px;letter-spacing:1px;font-weight:bold">CODEWITHSOLO / COD3BLACKAGENCY</div>'
 +'<h1 style="font-size:27px;line-height:1.2;margin:20px 0">'+html(title)+'</h1>'
 +body+'<p style="margin-top:28px;border-top:1px solid #455c46;padding-top:16px;font-size:12px;color:#cad5ca">codewithsolo.com · Business systems, clear ownership, practical execution</p></div></body></html>';
}
function row(label,value){return '<p style="margin:10px 0"><strong style="color:#c2fc83">'+html(label)+': </strong>'+html(value||'Not provided')+'</p>'}
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed.'});
 if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type']??'')))return json(res,415,{error:'Expected JSON.'});
 const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body??null);
 if(Buffer.byteLength(raw,'utf8')>MAX_BYTES)return json(res,413,{error:'Request too large.'});
 let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body}catch{return json(res,400,{error:'Invalid JSON.'})}
 if(!body||Array.isArray(body)||typeof body!=='object')return json(res,400,{error:'Invalid form data.'});
 const parsed=parseInput(body);
 if(parsed.silent)return json(res,200,{success:true,reference:'received'});
 if(parsed.error)return json(res,400,{error:parsed.error});
 const {data}=parsed,key=process.env.RESEND_API_KEY;
 if(!key)return json(res,503,{error:'Inquiry delivery is temporarily unavailable. Please contact us by email.'});
 const fingerprint=data.email+'|'+data.service+'|'+data.vision;
 if(recent.size>100)recent.clear();
 const prior=recent.get(fingerprint);
 if(prior&&Date.now()-prior.time<60000)return json(res,200,{success:true,reference:prior.reference,confirmationSent:prior.confirmationSent});
 const reference='CWS-'+randomUUID().slice(0,8).toUpperCase();
 const bodyHtml=[row('Reference',reference),row('Name',data.name),row('Email',data.email),row('Business',data.business),row('Website',data.website),row('Service',SERVICES[data.service]),row('Management',MGMT[data.management]),row('Budget',data.budget||'Not specified'),row('Timeline',data.timeline),row('Business need',data.vision)].join('');
 try{
  const internal=await send({from:FROM,to:[TO],reply_to:data.email,subject:'New CodeWithSolo inquiry - '+SERVICES[data.service]+' - '+reference,html:emailMarkup('New project inquiry',bodyHtml),tags:[{name:'category',value:'project-inquiry'}]},key);
  if(!internal.ok){console.error('[inquiry] Internal Resend delivery not accepted:',internal.status);return json(res,502,{error:'Delivery could not be confirmed. Please contact us directly by email.'})}
  recent.set(fingerprint,{reference,time:Date.now(),confirmationSent:false});
  let confirmationSent=false;
  try{
   const first=data.name.split(/\s+/)[0];
   const confirmation=await send({from:FROM,to:[data.email],reply_to:TO,subject:'We received your project inquiry - '+reference,html:emailMarkup('We received your inquiry','<p>Hi '+html(first)+',</p><p>Thank you for describing what your business needs. We will review the request and reply with a practical next step. If it is a fit, we will discuss scope, pricing, ownership and support before any work begins.</p>'+row('Reference',reference)+row('Requested help',SERVICES[data.service])+'<p>No payment or contract has been created by this inquiry.</p>')},key);
   confirmationSent=confirmation.ok;
  }catch(err){console.error('[inquiry] Confirmation delivery exception:',err?.name||'error')}
  recent.set(fingerprint,{reference,time:Date.now(),confirmationSent});
  return json(res,200,{success:true,reference,confirmationSent});
 }catch(err){console.error('[inquiry] Internal delivery exception:',err?.name||'error');return json(res,503,{error:'We could not confirm delivery. Please contact us directly by email.'})}
}
