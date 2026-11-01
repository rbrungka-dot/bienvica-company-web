import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SHIPPING_POLICY_VERSION} from '../shared/shipping.mjs';
import {checkout,applySession} from '../netlify/functions/api.mjs';
function database(){
 const rows=new Map([['products/drink',{name:'Drink',brand:'Bienvica',active:true,stock:100,priceSatang:24000,erpSku:'ONE'}],['settings/shop',{shippingFeeSatang:6000,shippingPolicyVersion:SHIPPING_POLICY_VERSION}]]);
 const doc=path=>({path,id:path.split('/').at(-1),get:async()=>snapshot(path),update:async value=>rows.set(path,{...rows.get(path),...value})});
 const snapshot=path=>({exists:rows.has(path),id:path.split('/').at(-1),ref:doc(path),data:()=>structuredClone(rows.get(path))});
 return {rows,doc,runTransaction:async fn=>{let writing=false;const pending=[];const get=async ref=>{assert.equal(writing,false,'reads before writes');return snapshot(ref.path);};const result=await fn({get,getAll:async(...refs)=>Promise.all(refs.map(get)),set:(ref,value)=>{writing=true;pending.push([ref.path,value,false]);},update:(ref,value)=>{writing=true;pending.push([ref.path,value,true]);},create:(ref,value)=>{assert.equal(rows.has(ref.path),false);writing=true;pending.push([ref.path,value,false]);}});for(const [path,value,merge]of pending)rows.set(path,merge?{...rows.get(path),...structuredClone(value)}:structuredClone(value));return result;}};
}
const id='11111111-1111-4111-8111-111111111111';
const input={checkoutId:id,items:[{productId:'drink',quantity:2}],shipping:{name:'Buyer',email:'test@example.test',phone:'0812345678',address:'Test street',postalCode:'47000'}};
const request=()=>new Request('https://bienvica.com/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
function settings(){process.env.CHECKOUT_ENABLED='true';process.env.ERP_INTEGRATION_ENABLED='true';process.env.STRIPE_SECRET_KEY='sk_live_tests_only';process.env.ORDER_TOKEN_SECRET='unit-tests-only-'.repeat(4);process.env.SITE_URL='https://bienvica.com';}
test('ERP checkout holds before Stripe and never deducts temporary web stock; retries reuse session',async()=>{
 settings();const db=database();let stripeCalls=0;const sync=async(d,oid)=>{assert.equal(stripeCalls,0);const order=d.rows.get('orders/'+oid);assert.equal(order.reservation,'preparing');d.rows.set('orders/'+oid,{...order,reservation:'held',erp:{required:true,sync:'reserved'}});};
 const stripe={checkout:{sessions:{create:async(params,opts)=>{stripeCalls++;assert.equal(params.line_items[0].quantity,2);assert.equal(params.line_items[1].price_data.unit_amount,6000);assert.equal(opts.idempotencyKey,'checkout:'+id);return {id:'cs_live_checkout_test',url:'https://checkout.stripe.com/test'};},retrieve:async()=>({status:'open',url:'https://checkout.stripe.com/test'})}}};
 const deps={db,stripe,getIdentity:async()=>null,limit:async()=>{},sync};const response=await checkout(request(),deps);assert.equal(response.status,200);assert.equal(db.rows.get('products/drink').stock,100);await checkout(request(),deps);assert.equal(stripeCalls,1);
});
test('ERP outage persists retryable intent and never opens a payment page',async()=>{
 settings();const db=database();let creates=0;await assert.rejects(()=>checkout(request(),{db,stripe:{checkout:{sessions:{create:async()=>creates++}}},getIdentity:async()=>null,limit:async()=>{},sync:async()=>{throw Error('ERP offline')}}),/offline/);assert.equal(creates,0);assert.equal(db.rows.get('orders/'+id).reservation,'preparing');assert.equal(db.rows.get('products/drink').stock,100);
});
test('verified Stripe payment creates durable ERP sync intent; failure never loses paid state',async()=>{
 settings();const db=database();db.rows.set('orders/'+id,{id,...input,shipping:input.shipping,lines:[{productId:'drink',name:'Drink',quantity:2,priceSatang:24000,erpSku:'ONE'}],total:54000,shippingFee:6000,paymentStatus:'pending',reservation:'held',erp:{required:true,sync:'reserved'},stripeSessionId:'cs_live_checkout_test'});
 let tries=0;const session={id:'cs_live_checkout_test',metadata:{orderId:id},payment_status:'paid',amount_total:54000,currency:'thb',livemode:true};const deps={db,sync:async()=>{tries++;throw Error('ERP offline')},email:async()=>{}};
 await applySession(session,'checkout.session.completed','evt_test_1',deps);assert.equal(db.rows.get('orders/'+id).paymentStatus,'paid');assert.equal(db.rows.get('orders/'+id).erp.action,'paid');assert.equal(db.rows.get('products/drink').stock,100);await applySession(session,'checkout.session.completed','evt_test_1',deps);assert.equal(tries,2);assert.equal([...db.rows.keys()].filter(k=>k.startsWith('orderNotifications/')).length,1);
});
test('Stripe terminal failure releases ERP via outbox without returning temporary stock twice',async()=>{
 settings();const db=database();db.rows.set('orders/'+id,{id,lines:[{productId:'drink',quantity:2}],paymentStatus:'pending',reservation:'held',erp:{required:true,sync:'reserved'},stripeSessionId:'cs_live_checkout_test'});
 let call=0;await applySession({id:'cs_live_checkout_test',metadata:{orderId:id}},'checkout.session.expired','evt_expired',{db,sync:async(d,oid)=>{call++;assert.equal(d.rows.get('orders/'+oid).erp.action,'cancel');},email:async()=>{}});assert.equal(call,1);assert.equal(db.rows.get('products/drink').stock,100);assert.equal(db.rows.get('orders/'+id).reservation,'released');
});
