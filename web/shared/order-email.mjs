import { randomUUID } from 'node:crypto';

export const ORDER_EMAIL_TO = ['thanakrittum@gmail.com'];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100)+' บาท';

export function emailConfiguration(env=process.env){
  const from=(env.ORDER_EMAIL_FROM||'').trim();
  const validFrom=/^[^\r\n<>]*<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>$/.test(from)||/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from);
  return {ready:!!env.RESEND_API_KEY&&validFrom,from,to:[...ORDER_EMAIL_TO]};
}

export function paidOrderNotification(order,session,now=Date.now()){
  // Only a server-verified, live payment transition can enqueue a shop notification.
  if(order.paymentStatus!=='paid'||session.livemode!==true)return null;
  return {status:'pending',orderId:order.id,createdAt:now,nextAttemptAt:now,attempts:0,
    order:{id:order.id,lines:order.lines,shipping:order.shipping,total:order.total,shippingFee:order.shippingFee,paidAt:order.paidAt},to:[...ORDER_EMAIL_TO]};
}

export function orderEmail(order,from,to=ORDER_EMAIL_TO){
  const shipping=order.shipping;
  const items=order.lines.map(l=>`${l.name} × ${l.quantity} — ${money(l.priceSatang*l.quantity)}`);
  const date=new Intl.DateTimeFormat('th-TH-u-ca-gregory-nu-latn',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(order.paidAt));
  const text=[`Bienvica — มีออเดอร์ชำระแล้ว`,`เลขออเดอร์: ${order.id}`,`ชำระเมื่อ: ${date} (เวลาไทย)`,'',...items,`ค่าจัดส่ง: ${money(order.shippingFee)}`,`ยอดชำระ: ${money(order.total)}`,'','ข้อมูลจัดส่ง',shipping.name,shipping.address,`รหัสไปรษณีย์: ${shipping.postalCode}`,`โทร: ${shipping.phone}`,`อีเมลลูกค้า: ${shipping.email}`,'','เปิดหลังบ้านเพื่อตรวจและเตรียมจัดส่ง: https://bienvica.com/#/admin/orders'].join('\n');
  const html=`<!doctype html><html lang="th"><meta charset="utf-8"><body style="margin:0;background:#f6f4ed;color:#233c31;font-family:Arial,sans-serif"><main style="max-width:600px;margin:24px auto;padding:28px;background:white;border-top:6px solid #284c3b"><p style="letter-spacing:3px">BIENVICA</p><h1 style="font-size:24px">มีออเดอร์ชำระแล้ว</h1><p>เลขออเดอร์: ${escape(order.id)}<br>${escape(date)} (เวลาไทย)</p><hr>${items.map(item=>`<p>${escape(item)}</p>`).join('')}<p>ค่าจัดส่ง: ${escape(money(order.shippingFee))}</p><h2 style="font-size:20px">ยอดชำระ ${escape(money(order.total))}</h2><hr><h2 style="font-size:20px">ข้อมูลจัดส่ง</h2><p>${escape(shipping.name)}<br>${escape(shipping.address).replace(/\n/g,'<br>')}<br>${escape(shipping.postalCode)}</p><p>โทร: ${escape(shipping.phone)}<br>อีเมลลูกค้า: ${escape(shipping.email)}</p><p><a href="https://bienvica.com/#/admin/orders" style="display:inline-block;padding:14px 20px;background:#284c3b;color:white;text-decoration:none">เปิดคำสั่งซื้อในหลังบ้าน</a></p><p style="font-size:12px;color:#666">ข้อมูลสำหรับทีมจัดส่ง โปรดเก็บรักษาข้อมูลลูกค้าเป็นส่วนตัว</p></main></body></html>`;
  return {from,to:[...to],subject:`Bienvica: ชำระแล้ว ${money(order.total)} · ${order.id}`,text,html};
}

export async function sendEmail(message,key,{env=process.env,fetchImpl=fetch}={}){
  if(!emailConfiguration(env).ready)throw new Error('email_not_configured');
  const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(message),signal:AbortSignal.timeout(5000)});
  // Never log provider response bodies: they can contain addresses or other personal data.
  if(!response.ok)throw new Error(`email_provider_http_${response.status}`);
  const result=await response.json();if(!result.id)throw new Error('email_provider_missing_id');return result.id;
}

export async function deliverOrderEmail(db,id,{env=process.env,fetchImpl=fetch,now=Date.now()}={}){
  const config=emailConfiguration(env);if(!config.ready)return false;
  const ref=db.doc('orderNotifications/'+id),lease=randomUUID();
  const job=await db.runTransaction(async t=>{
    const snap=await t.get(ref),j=snap.data();
    if(!j||!['pending','sending'].includes(j.status)||j.nextAttemptAt>now||(j.leaseUntil||0)>now)return null;
    // Resend deduplication lasts 24h. Stop before expiry if an earlier send is uncertain.
    if(j.firstAttemptAt!=null&&now-j.firstAttemptAt>=23*3600000){t.update(ref,{status:'review',nextAttemptAt:Number.MAX_SAFE_INTEGER,lastError:'ตรวจประวัติใน Resend ก่อนส่งซ้ำ'});return null;}
    const message=j.message||orderEmail(j.order,config.from,j.to);
    t.update(ref,{status:'sending',lease,leaseUntil:now+120000,firstAttemptAt:j.firstAttemptAt??now,attempts:j.attempts+1,message});
    return {...j,message};
  });
  if(!job)return false;
  let providerId,error;
  try{providerId=await sendEmail(job.message,'bienvica-paid-order/'+id,{env,fetchImpl});}
  catch(e){error=/^email_/.test(e.message)?e.message:'email_send_uncertain';}
  await db.runTransaction(async t=>{
    const current=(await t.get(ref)).data();if(current?.lease!==lease)return;
    t.update(ref,providerId?{status:'sent',providerId,sentAt:now,leaseUntil:0,lastError:null,nextAttemptAt:Number.MAX_SAFE_INTEGER}:{status:'pending',lastError:error,leaseUntil:0,nextAttemptAt:now+Math.min(3600000,60000*2**Math.min(job.attempts,6))});
  });
  return !!providerId;
}

export async function flushOrderEmails(db,options={}){
  if(!emailConfiguration(options.env).ready)return;
  const jobs=await db.collection('orderNotifications').where('nextAttemptAt','<=',options.now??Date.now()).limit(3).get();
  for(const job of jobs.docs){try{await deliverOrderEmail(db,job.id,options);}catch{console.error('Order notification retry failed');}}
}
