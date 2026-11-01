import { isSellableProduct } from './bienvica-catalog.mjs';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export function requireValue(ok,message='ข้อมูลไม่ถูกต้อง'){if(!ok)throw new HttpError(400,message);}
export function text(value,max=200,required=true){requireValue(typeof value==='string'&&value.length<=max&&(!required||value.trim().length>0));return value.trim();}
export function validateCheckout(body){
  requireValue(body&&/^[a-f0-9-]{36}$/i.test(body.checkoutId||''),'เลขคำขอสั่งซื้อไม่ถูกต้อง');
  requireValue(Array.isArray(body.items)&&body.items.length>0&&body.items.length<=20,'กรุณาเลือกสินค้า');
  const seen=new Set();const items=body.items.map(i=>{requireValue(i&&/^[a-zA-Z0-9_-]{1,100}$/.test(i.productId||'')&&!seen.has(i.productId),'รายการสินค้าซ้ำหรือไม่ถูกต้อง');seen.add(i.productId);requireValue(Number.isInteger(i.quantity)&&i.quantity>=1&&i.quantity<=99,'จำนวนสินค้าไม่ถูกต้อง');return{productId:i.productId,quantity:i.quantity};}).sort((a,b)=>a.productId.localeCompare(b.productId));
  const s=body.shipping||{};const shipping={name:text(s.name),email:text(s.email,254),phone:text(s.phone,30),address:text(s.address,1000),postalCode:text(s.postalCode,5)};
  requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email),'อีเมลไม่ถูกต้อง');requireValue(/^[0-9+ ()-]{8,30}$/.test(shipping.phone),'เบอร์โทรไม่ถูกต้อง');requireValue(/^\d{5}$/.test(shipping.postalCode),'รหัสไปรษณีย์ต้องมี 5 หลัก');
  return{checkoutId:body.checkoutId,items,shipping};
}
export function quoteProducts(items,products,shippingFee){
  requireValue(Number.isSafeInteger(shippingFee)&&shippingFee>=0,'ยังไม่ได้กำหนดค่าจัดส่ง');
  const lines=items.map(i=>{const p=products.find(p=>p.id===i.productId);requireValue(isSellableProduct(p),'สินค้าไม่พร้อมจำหน่าย');requireValue(Number.isSafeInteger(p.priceSatang)&&p.priceSatang>0,'ยังไม่ได้กำหนดราคาสินค้า');requireValue(Number.isSafeInteger(p.stock)&&p.stock>=i.quantity,'สินค้าไม่เพียงพอ');return{productId:p.id,name:p.name,quantity:i.quantity,priceSatang:p.priceSatang};});
  const subtotal=lines.reduce((sum,p)=>sum+p.quantity*p.priceSatang,0),total=subtotal+shippingFee;requireValue(Number.isSafeInteger(total)&&total<=100000000,'ยอดรวมไม่ถูกต้อง');return{lines,subtotal,shippingFee,total,currency:'thb'};
}
export const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function orderToken(id,secret){if(!secret||secret.length<32)throw new HttpError(503,'ระบบติดตามคำสั่งซื้อยังไม่พร้อม');return createHmac('sha256',secret).update(id).digest('base64url');}
export function validOrderToken(id,token,secret){if(typeof token!=='string')return false;const expected=Buffer.from(orderToken(id,secret)),actual=Buffer.from(token);return expected.length===actual.length&&timingSafeEqual(expected,actual);}
export function paymentAction(order,session,eventType){
  if(order.paymentStatus==='paid')return 'ignore';
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(eventType)){
    if(session.payment_status!=='paid')return 'wait';
    if(order.reservation!=='held')throw new HttpError(409,'Cannot fulfill a released reservation');
    if(session.amount_total!==order.total||session.currency!=='thb')throw new HttpError(409,'Payment total mismatch');return 'paid';
  }
  if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(eventType)&&order.reservation==='held')return 'release';
  return 'ignore';
}
