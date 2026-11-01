import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/api.mjs';
test('server does not substitute demo data when Firebase is missing',async()=>{delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;const r=await handler(new Request('https://example.test/api/bootstrap'));assert.equal(r.status,503);assert.match((await r.json()).error,/Firebase/);});
test('checkout is closed by default, even if a browser submits a valid-looking order',async()=>{process.env.CHECKOUT_ENABLED='false';const r=await handler(new Request('https://example.test/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}));assert.equal(r.status,503);assert.match((await r.json()).error,/ยังไม่เปิดรับ/);});
test('webhook endpoint fails closed without a signing secret',async()=>{delete process.env.STRIPE_WEBHOOK_SECRET;const r=await handler(new Request('https://example.test/api/stripe-webhook',{method:'POST',body:'{"type":"checkout.session.completed"}'}));assert.equal(r.status,503);});
