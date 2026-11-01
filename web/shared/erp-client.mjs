import {createHmac} from 'node:crypto';
import {HttpError,requireValue} from './commerce.mjs';
export const erpEnabled=(env=process.env)=>env.ERP_INTEGRATION_ENABLED==='true';
export function erpConfiguration(env=process.env){
 let url;try{url=new URL(env.ERP_BRIDGE_URL||'');}catch{}
 return {enabled:erpEnabled(env),configured:!!url&&url.protocol==='https:'&&url.hostname==='bev-pro-erp.netlify.app'&&url.pathname==='/.netlify/functions/commerce'&&!url.username&&!url.password&&!url.search&&!url.hash&&typeof env.ERP_BRIDGE_SECRET==='string'&&env.ERP_BRIDGE_SECRET.length>=32};
}
export async function erpRequest(operation,data={}, {env=process.env,fetcher=fetch,now=Date.now}={}){
 const config=erpConfiguration(env);if(!config.configured)throw new HttpError(503,'ยังไม่ได้ตั้งค่าบริการเชื่อม ERP');
 const raw=JSON.stringify({operation,data}),timestamp=String(now()),signature=createHmac('sha256',env.ERP_BRIDGE_SECRET).update(timestamp+'\n'+raw).digest('hex');
 let response;try{response=await fetcher(env.ERP_BRIDGE_URL,{method:'POST',headers:{'content-type':'application/json','x-erp-timestamp':timestamp,'x-erp-signature':signature},body:raw,signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new HttpError(503,'ติดต่อ ERP ไม่สำเร็จ กรุณาลองอีกครั้ง');}
 let result;try{result=await response.json();}catch{throw new HttpError(503,'ERP ตอบกลับไม่สมบูรณ์');}
 if(!response.ok)throw new HttpError(response.status===409?409:503,response.status===409?'ERP ไม่สามารถทำรายการได้: '+String(result.error||'กรุณาตรวจสต็อก').slice(0,200):'บริการเชื่อม ERP ยังไม่พร้อม');
 return result;
}
export function mappedLines(order){
 const lines=order.lines.map(l=>{requireValue(/^[A-Z0-9_-]{1,100}$/.test(l.erpSku||''),'กรุณาจับคู่ SKU ในหลังบ้านก่อนเปิดขาย');return {sku:l.erpSku,quantity:l.quantity,priceSatang:l.priceSatang};});
 requireValue(new Set(lines.map(l=>l.sku)).size===lines.length,'สินค้าบนเว็บหลายรายการผูก SKU เดียวกัน กรุณาตรวจการจับคู่');return lines;
}
export function reservePayload(order){return {checkoutId:order.id,date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(order.createdAt)),shipping:order.shipping,lines:mappedLines(order),shippingFeeSatang:order.shippingFee,totalSatang:order.total,livemode:true};}
export async function syncERPOrder(db,id,call=erpRequest){
 const ref=db.doc('orders/'+id),snapshot=await ref.get();if(!snapshot.exists)return;const order=snapshot.data();if(!order.erp?.required||order.erp.sync==='done')return;
 // Only stored server-verified Stripe state determines a mutation on ERP.
 const action=order.paymentStatus==='paid'?'paid':['expired','failed'].includes(order.paymentStatus)?'cancel':'reserve';
 try{
  let result;if(action==='reserve')result=await call('reserve',reservePayload(order));
  else if(action==='paid'){
   if(order.stripeLivemode!==true||!order.stripeSessionId)throw new HttpError(409,'ต้องตรวจหลักฐาน Stripe ก่อนเชื่อม ERP');
   result=await call('paid',{checkoutId:id,sessionId:order.stripeSessionId,amountSatang:order.total,currency:'thb',livemode:true});
  }else result=await call('cancel',{checkoutId:id,sessionId:order.stripeSessionId||''});
  await db.runTransaction(async tx=>{const latest=(await tx.get(ref)).data();if(!latest?.erp?.required)return;
   const current=latest.paymentStatus==='paid'?'paid':['expired','failed'].includes(latest.paymentStatus)?'cancel':'reserve';
   if(current!==action)return;tx.update(ref,{erp:{...latest.erp,...result,action,sync:action==='reserve'?'reserved':'done',lastError:null,updatedAt:new Date().toISOString()},...(action==='reserve'?{reservation:'held'}:{})});
  });return result;
 }catch(error){await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current?.erp?.required&&current.erp.sync!=='done')tx.update(ref,{erp:{...current.erp,sync:'retry',lastError:String(error.message||'ERP unavailable').slice(0,240),updatedAt:new Date().toISOString()}});});throw error;}
}
export async function flushERPOrders(db,call=erpRequest){
 const list=await db.collection('orders').where('erp.sync','in',['pending','retry']).limit(20).get();
 for(const doc of list.docs){const o=doc.data();if(o.erp.sync==='done'||o.paymentStatus==='pending'&&o.erp.sync==='reserved')continue;try{await syncERPOrder(db,doc.id,call);}catch{console.error('ERP sync deferred for order');}}
}
export async function withERPStock(products,{enabled=erpEnabled(),call=erpRequest}={}){
 if(!enabled)return products;
 let catalog;try{catalog=(await call('catalog')).skus;}catch{return products.map(p=>({...p,stock:0,stockSource:'erp-unavailable'}));}
 return products.map(p=>{const sku=catalog.find(s=>s.code===p.erpSku),match=sku&&sku.priceSatang===p.priceSatang;return {...p,stock:match?sku.available:0,stockSource:match?'erp':p.erpSku?'erp-price-or-sku-mismatch':'erp-unmapped'};});
}
