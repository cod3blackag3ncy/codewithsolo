import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
process.env.RESEND_API_KEY='mock-api-key';
const source=fs.readFileSync(new URL('../api/briefing.js',import.meta.url),'utf8');
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const body={name:'Demo Client',email:'demo@example.com',business:'Test',website:'example.com',service:'system',vision:'We need a simple workflow for bookings and customers.',management:'self',budget:'1k-3k',timeline:'standard',consent:true,company_fax:''};
const req=(data,method='POST',mime='application/json')=>({body:data,method,headers:{'content-type':mime}});
const res=()=>({code:0,body:null,setHeader(){return this},status(n){this.code=n;return this},json(v){this.body=v;return this}});
const ok=()=>new Response(JSON.stringify({id:'accepted-123'}),{status:200,headers:{'content-type':'application/json'}});
test('valid sends owner and customer email; detects duplicate',async()=>{
 let sent=[];globalThis.fetch=async(u,o)=>{sent.push(JSON.parse(o.body));return ok()};
 let a=res(),b=res();await handler(req(body),a);await handler(req(body),b);
 assert.equal(a.code,200);assert.equal(a.body.success,true);assert.equal(sent.length,2);
 assert.match(a.body.reference,/^CWS-/);assert.equal(b.body.reference,a.body.reference);
 assert.equal(sent[0].to[0],'cod3blackagency@gmail.com');assert.equal(sent[1].to[0],body.email);
});
test('invalid, non-consented and honeypot data do not notify',async()=>{
 let count=0;globalThis.fetch=async()=>{count++;return ok()};
 for(let change of [{consent:false},{email:'bad'},{service:'fake'},{vision:'short'}]){
  let r=res();await handler(req({...body,...change}),r);assert.equal(r.code,400);
 }
 let bot=res();await handler(req({...body,company_fax:'spam'}),bot);assert.equal(bot.code,200);
 assert.equal(count,0);
});
test('method, media and size limits',async()=>{
 let a=res(),b=res(),c=res();
 await handler(req(body,'GET'),a);await handler(req(body,'POST','text/plain'),b);await handler(req('x'.repeat(15000)),c);
 assert.equal(a.code,405);assert.equal(b.code,415);assert.equal(c.code,413);
});
test('undelivered messages are not reported as accepted',async()=>{
 globalThis.fetch=async()=>new Response(JSON.stringify({message:'rejected'}),{status:422});
 let r=res();await handler(req({...body,email:'fail@example.com'}),r);assert.equal(r.code,502);
 assert.equal(r.body.success,undefined);
});
test('HTML is escaped in internal email',async()=>{
 let captured='';globalThis.fetch=async(u,o)=>{let m=JSON.parse(o.body);if(!captured)captured=m.html;return ok()};
 let r=res();await handler(req({...body,email:'xss@example.com',business:'<script>alert(1)</script>',vision:'<img src=x> Need a secure customer system.'}),r);
 assert.equal(r.code,200);assert.match(captured,/&lt;script&gt;/);assert.doesNotMatch(captured,/<script>/);
});
test('unconfigured Resend refuses delivery',async()=>{
 const old=process.env.RESEND_API_KEY;delete process.env.RESEND_API_KEY;
 let r=res();await handler(req({...body,email:'missing@example.com'}),r);
 assert.equal(r.code,503);process.env.RESEND_API_KEY=old;
});
