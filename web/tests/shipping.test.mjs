import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shippingFeeSatang, SHIPPING_POLICY_VERSION} from '../shared/shipping.mjs';
import {quoteProducts} from '../shared/commerce.mjs';
test('approved 50 baht rate supersedes unset and unconfirmed legacy settings',()=>{
 for(const settings of [undefined,{}, {shippingFeeSatang:null},{shippingFeeSatang:0},{shippingFeeSatang:9000}]) assert.equal(shippingFeeSatang(settings),5000);
 assert.equal(shippingFeeSatang({shippingPolicyVersion:SHIPPING_POLICY_VERSION,shippingFeeSatang:7000}),7000);
});
test('shipping is charged once across bottles, packs and multiple quantities',()=>{
 const products=[{id:'single',active:true,name:'Single',stock:100,priceSatang:24000},{id:'pack',active:true,name:'Pack',stock:100,priceSatang:240000}];
 for(const items of [[{productId:'single',quantity:1}],[{productId:'pack',quantity:2}],[{productId:'single',quantity:3},{productId:'pack',quantity:2}]]){
  const quote=quoteProducts(items,products,shippingFeeSatang());
  assert.equal(quote.shippingFee,5000);assert.equal(quote.total-quote.subtotal,5000);
 }
});
