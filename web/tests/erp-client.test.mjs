import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {erpConfiguration,erpRequest,withERPStock,mappedLines,syncERPOrder,flushERPOrders} from '../shared/erp-client.mjs';
const env={ERP_INTEGRATION_ENABLED:'true',ERP_BRIDGE_URL:'https://bev-pro-erp.netlify.app/.netlify/functions/commerce',ERP_BRIDGE_SECRET:'unit-test-secret-'.repeat(3)};
function database(order){let value=structuredClone(order);const ref={get:async()=>({exists:!!value,data:()=>structuredClone(value)})};return {doc:()=>ref,runTransaction:async fn=>fn({get:async()=>({exists:!!value,data:()=>structuredClone(value)}),update:(_r,data)=>{value={...value,...structuredClone(data)};}}),collection:()=>({where:()=>({limit:()=>({get:async()=>({docs:[{id:value.id,data:()=>structuredClone(value)}]})})})}),get:()=>value};}
const base={id:'11111111-1111-4111-8111-111111111111',createdAt:'2026-10-19T01:00:00Z',paymentStatus:'pending',reservation:'preparing',shipping:{name:'Test'},lines:[{productId:'p',erpSku:'ONE',quantity:2,priceSatang:24000}],total:54000,shippingFee:6000,erp:{required:true,sync:'pending'}};
test('ERP server requests sign exact body and fail closed for wrong URL/config/response',async()=>{
 assert.equal(erpConfiguration(env).configured,true);assert.equal(erpConfiguration({...env,ERP_BRIDGE_URL:'https://attacker.test/x'}).configured,false);
 const result=await erpRequest('catalog',{}, {env,now:()=>1792371600000,fetcher:async(url,request)=>{assert.equal(url,env.ERP_BRIDGE_URL);assert.equal(request.headers['x-erp-signature'],createHmac('sha256',env.ERP_BRIDGE_SECRET).update(request.headers['x-erp-timestamp']+'\n'+request.body).digest('hex'));return Response.json({skus:[]});}});assert.deepEqual(result,{skus:[]});
 await assert.rejects(()=>erpRequest('catalog',{}, {env:{}}),/ตั้งค่า/);await assert.rejects(()=>erpRequest('catalog',{}, {env,fetcher:async()=>{throw Error('timeout')}}),/ติดต่อ/);await assert.rejects(()=>erpRequest('catalog',{}, {env,fetcher:async()=>new Response('bad')}),/ตอบกลับ/);
});
test('live availability uses mapped ERP SKU and exact price; never falls back to temporary stock',async()=>{
 const products=[{id:'p',erpSku:'ONE',priceSatang:24000,stock:100},{id:'q',erpSku:'PACK',priceSatang:240000,stock:100},{id:'r',stock:100}];
 const list=await withERPStock(products,{enabled:true,call:async()=>({skus:[{code:'ONE',priceSatang:24000,available:7},{code:'PACK',priceSatang:230000,available:8}]})});assert.deepEqual(list.map(p=>p.stock),[7,0,0]);
 const unavailable=await withERPStock(products,{enabled:true,call:async()=>{throw Error('offline')}});assert.deepEqual(unavailable.map(p=>p.stock),[0,0,0]);assert.deepEqual(await withERPStock(products,{enabled:false}),products);
 assert.throws(()=>mappedLines({...base,lines:[{productId:'p'}]}),/จับคู่/);
});
test('durable synchronization reserves once, retries failures and only pays from verified server state',async()=>{
 const db=database(base),calls=[];await syncERPOrder(db,base.id,async(op,data)=>{calls.push([op,data]);return{orderId:'web-'+base.id,status:'Reserved'};});assert.equal(calls[0][0],'reserve');assert.equal(db.get().reservation,'held');assert.equal(db.get().erp.sync,'reserved');
 const paid=database({...base,paymentStatus:'paid',stripeSessionId:'cs_live_test',stripeLivemode:true});let fail=true;const call=async(op)=>{assert.equal(op,'paid');if(fail)throw Error('offline');return {invoiceNo:'IV1'};};await assert.rejects(()=>syncERPOrder(paid,base.id,call));assert.equal(paid.get().erp.sync,'retry');fail=false;await syncERPOrder(paid,base.id,call);assert.equal(paid.get().erp.sync,'done');await syncERPOrder(paid,base.id,()=>{throw Error('must not repeat')});
 const sandbox=database({...base,paymentStatus:'paid',stripeSessionId:'cs_test',stripeLivemode:false});await assert.rejects(()=>syncERPOrder(sandbox,base.id,()=>{throw Error('must not call')}),/หลักฐาน Stripe/);
 const expired=database({...base,paymentStatus:'expired'});await syncERPOrder(expired,base.id,async op=>{assert.equal(op,'cancel');return {status:'released'};});assert.equal(expired.get().erp.action,'cancel');
});
test('outbox does not mark stale reserve response done after payment arrives',async()=>{
 const db=database(base);await syncERPOrder(db,base.id,async()=>{await db.runTransaction(tx=>tx.update(null,{paymentStatus:'paid',erp:{required:true,sync:'pending'}}));return {status:'Reserved'};});assert.equal(db.get().paymentStatus,'paid');assert.equal(db.get().erp.sync,'pending');
 const legacy=database({...base,erp:null});await syncERPOrder(legacy,base.id,()=>{throw Error('legacy order must not be imported')});
});
