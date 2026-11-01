import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
const bundle=await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022'});
async function ready(win,predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI state did not settle: '+win.document.body.textContent.slice(-700));}
async function setup(){const errors=[];const console=new VirtualConsole();console.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e)});const dom=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'https://example.test/',runScripts:'dangerously',virtualConsole:console});dom.window.structuredClone=globalThis.structuredClone;dom.window.BIENVICA_CONFIG={mode:'demo',firebase:{}};dom.window.scrollTo=()=>{};dom.window.eval(bundle.outputFiles[0].text);await ready(dom.window,()=>dom.window.document.querySelector('.brand-grid'));return{dom,w:dom.window,d:dom.window.document,errors};}
test('home → brand filter → product → cart preserves selected product and quantity',async()=>{const {dom,w,d,errors}=await setup();w.location.hash='/shop?brand=B-time';await ready(w,()=>d.querySelector('.filters'));assert.equal(d.querySelectorAll('.product').length,1);assert.match(d.querySelector('.product').textContent,/Midnight Rose/);w.location.hash='/product/midnight-rose';await ready(w,()=>d.querySelector('#add-cart-form'));d.querySelector('#quantity').value='2';d.querySelector('#add-cart-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await ready(w,()=>d.querySelector('header').textContent.includes('(2)'));w.location.hash='/cart';await ready(w,()=>d.querySelector('.cart-row'));assert.match(d.querySelector('.cart-row').textContent,/Midnight Rose/);assert.equal(d.querySelector('output').textContent,'2');d.querySelector('[data-action="cart-remove"]').click();await ready(w,()=>d.querySelector('.empty'));assert.equal(errors.length,0);dom.window.close();});
test('demo admin draft stays private until publish; typed markup remains text',async()=>{const {dom,w,d}=await setup();w.location.hash='/admin';await ready(w,()=>d.querySelector('.empty'));assert.match(d.querySelector('.empty').textContent,/เฉพาะผู้ดูแล/);w.location.hash='/login';await ready(w,()=>d.querySelector('[data-action="demo-admin"]'));d.querySelector('[data-action="demo-admin"]').click();await ready(w,()=>d.querySelector('#content-form'));const title=d.querySelector('#content-title');title.value='<img src=x onerror=alert(1)> ทดสอบ';title.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(d.querySelector('#preview-title img'),null);const form=d.querySelector('#content-form');const save=form.querySelector('[value="no"]');form.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:save}));await ready(w,()=>d.querySelector('#toast').textContent.includes('บันทึกร่าง'));w.location.hash='/';await ready(w,()=>d.querySelector('.hero'));assert(!d.querySelector('.hero h1').textContent.includes('ทดสอบ'));w.location.hash='/admin';await ready(w,()=>d.querySelector('#content-form'));const publish=d.querySelector('[value="yes"]');publish.form.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:publish}));await ready(w,()=>d.querySelector('#toast').textContent.includes('เผยแพร่'));w.location.hash='/';await ready(w,()=>d.querySelector('.hero'));assert.match(d.querySelector('.hero h1').textContent,/ทดสอบ/);assert.equal(d.querySelector('.hero h1 img'),null);dom.window.close();});
test('shop email settings are admin-only and demo cannot send email',async()=>{
 const {dom,w,d}=await setup();w.location.hash='/admin/orders';await ready(w,()=>d.querySelector('.empty'));assert.equal(d.querySelector('#notification-test'),null);
 w.location.hash='/login';await ready(w,()=>d.querySelector('[data-action="demo-admin"]'));d.querySelector('[data-action="demo-admin"]').click();await ready(w,()=>d.querySelector('#content-form'));
 w.location.hash='/admin/orders';await ready(w,()=>d.querySelector('#notification-test'));assert.match(d.body.textContent,/thanakrittum@gmail.com/);assert.match(d.body.textContent,/ยังไม่พร้อมส่ง/);assert.equal(d.querySelector('#notification-test button').disabled,true);dom.window.close();
});

test('research QR destination exposes evidence, exact graph and native FAQ without buying or downloading unpublished report',async()=>{
 const {dom,w,d,errors}=await setup();w.requestAnimationFrame=fn=>fn();w.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true'};
 w.location.hash='/research?section=shot';await ready(w,()=>d.querySelector('#research-shot'));
 assert.equal(d.querySelector('#research-shot').dataset.scrolled,'true');
 assert.match(d.body.textContent,/สนับสนุนโดย สกว\./);
 assert.match(d.body.textContent,/0.27/);assert.match(d.body.textContent,/2.89/);assert.match(d.body.textContent,/0.75/);
 assert.equal(d.querySelector('.research-graph img').getAttribute('src'),'/assets/research-transport.png');
 assert.equal(d.querySelectorAll('.research-faq details').length,6);
 assert.equal(d.querySelector('.glp1-graph img').getAttribute('src'),'/assets/research-glp1.png');
 assert.equal(d.querySelectorAll('.shot-gda .gda-item').length,4);
 assert.equal(d.querySelector('a[href$=".pdf"]'),null);
 assert.match(d.body.textContent,/3,970/);
 assert.equal(d.querySelector('#research-shot [href*="cart"]'),null);
 assert.equal(d.querySelector('a[href$=".pptx"]'),null);
 assert.equal(d.querySelector('#research-form'),null);
 assert.equal(errors.length,0);dom.window.close();
});
test('admin can draft, publish, edit and unpublish a Facebook research entry; filters and public text stay safe',async()=>{
 const {dom,w,d}=await setup();w.requestAnimationFrame=fn=>fn();w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.location.hash='/admin/research';await ready(w,()=>d.querySelector('.empty'));assert.equal(d.querySelector('#research-form'),null);
 w.location.hash='/login';await ready(w,()=>d.querySelector('[data-action="demo-admin"]'));d.querySelector('[data-action="demo-admin"]').click();await ready(w,()=>d.querySelector('#content-form'));
 w.location.hash='/admin/research?id=new';await ready(w,()=>d.querySelector('#research-form'));
 const submit=async publish=>{const form=d.querySelector('#research-form'),button=form.querySelector(`[value="${publish}"]`);form.dispatchEvent(new w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:button}));await ready(w,()=>!d.querySelector('#research-form'));};
 for(const [key,value] of Object.entries({category:'facebook',title:'<img src=x onerror=alert(1)> กุหลาบ',summary:'เรื่องใหม่จากทีม',body:'เนื้อหาใหม่',sourceURL:'https://www.facebook.com/Bienvica/posts/123'}))d.querySelector(`[name="${key}"]`).value=value;
 await submit('no');w.location.hash='/research?section=library';await ready(w,()=>d.querySelector('.research-library'));assert.equal(d.querySelectorAll('.research-library-card').length,0);
 w.location.hash='/admin/research';await ready(w,()=>d.querySelector('.admin-list a'));d.querySelector('.admin-list a').click();await ready(w,()=>d.querySelector('#research-form'));assert.equal(d.querySelector('[name="sourceURL"]').value,'https://www.facebook.com/Bienvica/posts/123');await submit('yes');
 w.location.hash='/research?section=library&category=facebook';await ready(w,()=>d.querySelector('.research-library-card'));assert.equal(d.querySelector('.research-library-card h3 img'),null);assert.equal(d.querySelectorAll('.research-library-card').length,1);
 d.querySelector('.research-library-card a').click();await ready(w,()=>d.querySelector('.research-article'));assert.match(d.querySelector('.research-article-body').textContent,/เนื้อหาใหม่/);
 assert.equal(d.querySelector('.research-article a[target="_blank"]').getAttribute('rel'),'noopener noreferrer');
 w.location.hash='/admin/research';await ready(w,()=>d.querySelector('.admin-list a'));d.querySelector('.admin-list a').click();await ready(w,()=>d.querySelector('#research-form'));await submit('no');w.location.hash='/research?section=library';await ready(w,()=>d.querySelector('.research-library'));assert.equal(d.querySelectorAll('.research-library-card').length,0);dom.window.close();
});
