import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emailConfiguration,paidOrderNotification,orderEmail,deliverOrderEmail,flushOrderEmails} from '../shared/order-email.mjs';
const env={RESEND_API_KEY:'test-not-a-key',ORDER_EMAIL_FROM:'Bienvica <orders@notify.bienvica.com>'};
const order={id:'order-123',paymentStatus:'paid',paidAt:'2026-10-18T10:00:00Z',total:29000,shippingFee:5000,lines:[{name:'Bienvica <script>bad()</script>',quantity:1,priceSatang:24000}],shipping:{name:'Test <img src=x>',address:'172 test road\nBangkok',postalCode:'10000',phone:'0800000000',email:'buyer@example.test'}};
function database(job){
 const records=new Map([['orderNotifications/order-123',structuredClone(job)]]);let tail=Promise.resolve();
 const db={
  doc:path=>({path}),
  runTransaction(fn){
   const result=tail.then(()=>fn({
    get:async ref=>({data:()=>structuredClone(records.get(ref.path))}),
    update(ref,value){records.set(ref.path,{...records.get(ref.path),...structuredClone(value)});}
   }));tail=result.catch(()=>{});return result;
  },
  collection:()=>({where:()=>({limit:()=>({get:async()=>({docs:[{id:'order-123'}]})})})})
 };
 return{db,read:()=>records.get('orderNotifications/order-123')};
}
const liveJob=()=>paidOrderNotification(order,{livemode:true},1000);
const ok=async()=>({ok:true,json:async()=>({id:'provider-email-123'})});
test('only confirmed live paid orders queue shop mail, never sandbox or unpaid',()=>{
 assert(liveJob());for(const status of ['pending','expired','failed'])assert.equal(paidOrderNotification({...order,paymentStatus:status},{livemode:true}),null);
 for(const livemode of [false,undefined])assert.equal(paidOrderNotification(order,{livemode}),null);
 assert.deepEqual(liveJob().to,['thanakrittum@gmail.com']);
});
test('missing configuration leaves mail pending and rejects header injection in sender',async()=>{
 assert.equal(emailConfiguration({}).ready,false);assert.equal(emailConfiguration({...env,ORDER_EMAIL_FROM:'x\r\nBcc:other@example.test'}).ready,false);
 const {db,read}=database(liveJob());let calls=0;assert.equal(await deliverOrderEmail(db,'order-123',{env:{},fetchImpl:async()=>calls++}),false);assert.equal(calls,0);assert.equal(read().attempts,0);
});
test('message uses server totals, Thai local time, ASCII digits and escapes customer markup',()=>{
 const m=orderEmail(order,env.ORDER_EMAIL_FROM);for(const amount of ['240.00','50.00','290.00'])assert(m.text.includes(amount+' บาท'));
 assert.match(m.text,/17:00/);assert.match(m.html,/&lt;img/);assert(!m.html.includes('<script>'));assert(!/[๐-๙]/.test(m.text));assert.match(m.html,/https:\/\/bienvica.com\/#\/admin\/orders/);
 assert.deepEqual(m.to,['thanakrittum@gmail.com']);assert(!m.to.includes(order.shipping.email));
});
test('overlapping webhook and worker invocations send once; later retries are no-ops',async()=>{
 const {db,read}=database(liveJob());let calls=0;const fetchImpl=async()=>{calls++;await new Promise(r=>setTimeout(r,20));return ok();};
 await Promise.all([deliverOrderEmail(db,'order-123',{env,fetchImpl,now:1000}),deliverOrderEmail(db,'order-123',{env,fetchImpl,now:1000})]);
 assert.equal(calls,1);assert.equal(read().status,'sent');assert.equal(read().providerId,'provider-email-123');
 assert.equal(await deliverOrderEmail(db,'order-123',{env,fetchImpl,now:2000}),false);assert.equal(calls,1);
});
test('provider failure queues retry with stable message and idempotency key',async()=>{
 const {db,read}=database(liveJob());const requests=[];
 const fail=async(url,r)=>{requests.push({url,...r});return{ok:false,status:429};};
 assert.equal(await deliverOrderEmail(db,'order-123',{env,fetchImpl:fail,now:1000}),false);assert.equal(read().status,'pending');assert.equal(read().lastError,'email_provider_http_429');
 const success=async(url,r)=>{requests.push({url,...r});return ok();};
 await deliverOrderEmail(db,'order-123',{env:{...env,ORDER_EMAIL_FROM:'other@example.test'},fetchImpl:success,now:62000});
 assert.equal(read().status,'sent');assert.equal(requests.length,2);assert.equal(requests[0].body,requests[1].body);assert.equal(requests[0].headers['Idempotency-Key'],requests[1].headers['Idempotency-Key']);assert.equal(requests[0].url,'https://api.resend.com/emails');
});
test('active lease blocks parallel sends and uncertain sends stop before dedupe expires',async()=>{
 const {db,read}=database({...liveJob(),status:'sending',leaseUntil:5000,firstAttemptAt:1000});let calls=0;const fetchImpl=async()=>{calls++;return ok();};
 assert.equal(await deliverOrderEmail(db,'order-123',{env,fetchImpl,now:4000}),false);assert.equal(calls,0);
 await deliverOrderEmail(db,'order-123',{env,fetchImpl,now:1000+23*3600000});assert.equal(calls,0);assert.equal(read().status,'review');
});
test('scheduled mail retry works even while checkout is disabled',async()=>{
 const {db,read}=database(liveJob());await flushOrderEmails(db,{env:{...env,CHECKOUT_ENABLED:'false'},fetchImpl:ok,now:1000});assert.equal(read().status,'sent');
});
