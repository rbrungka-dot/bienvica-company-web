import { normalizeResearchPost } from '../shared/research.mjs';
import { shippingFeeSatang, SHIPPING_POLICY_VERSION } from '../shared/shipping.mjs';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sections, products, posts, demoPoll } from '../shared/initial.mjs';
import { bienvicaCatalog } from '../shared/bienvica-catalog.mjs';
export const config=window.BIENVICA_CONFIG||{mode:'demo',firebase:{}};
export const demo=config.mode!=='live';
let auth,storage,currentUser=null;
const clone=o=>JSON.parse(JSON.stringify(o));
const demoKey='bienvica:demo:v1';
let memory;try{memory=JSON.parse(localStorage.getItem(demoKey))}catch{}
if(!memory)memory={content:clone(sections),draft:clone(sections),products:clone(products),posts:clone(posts),comments:[],orders:[],poll:clone(demoPoll),settings:{shippingFeeSatang:null}};
const persist=()=>{try{localStorage.setItem(demoKey,JSON.stringify(memory))}catch{throw Error('พื้นที่จัดเก็บในเครื่องเต็ม กรุณาใช้ภาพขนาดเล็กลง');}};
export async function observeAuth(callback){
 if(demo){callback(null);return;}
 const app=initializeApp(config.firebase);auth=getAuth(app);storage=getStorage(app);
 onAuthStateChanged(auth,async u=>{currentUser=u;if(!u){callback(null);return}try{const token=await u.getIdTokenResult();callback({uid:u.uid,name:u.displayName||'สมาชิก',email:u.email,admin:token.claims.admin===true})}catch{callback(null)}});
}
export async function login(email,password){await signInWithEmailAndPassword(auth,email,password);}
export async function register(name,email,password){const u=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(u.user,{displayName:name});}
export async function google(){await signInWithPopup(auth,new GoogleAuthProvider());}
export async function resetPassword(email){if(!email)throw Error('กรอกอีเมลก่อนขอเปลี่ยนรหัสผ่าน');await sendPasswordResetEmail(auth,email);}
export async function logout(){if(!demo)await signOut(auth);}
export async function upload(file,publicAsset=false){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('ใช้ภาพ JPG, PNG หรือ WebP ขนาดไม่เกิน 8 MB');
 if(demo){return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({image:reader.result,imagePath:''});reader.onerror=reject;reader.readAsDataURL(file)})}
 if(!currentUser)throw Error('กรุณาเข้าสู่ระบบ');
 const path=publicAsset?`public/assets/${crypto.randomUUID()}`:`submissions/${currentUser.uid}/${crypto.randomUUID()}`;
 const target=ref(storage,path);await uploadBytes(target,file,{contentType:file.type});return{image:publicAsset?await getDownloadURL(target):'',imagePath:path};
}
export async function api(path,{method='GET',data}={}){
 if(demo)return demoApi(path,method,data);
 const headers={};if(data!==undefined)headers['Content-Type']='application/json';if(currentUser)headers.Authorization='Bearer '+await currentUser.getIdToken();
 const response=await fetch('/api'+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});let result;try{result=await response.json()}catch{throw Error('เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่')};if(!response.ok)throw Error(result.error||'เกิดข้อผิดพลาด');return result;
}
async function demoApi(path,method,data){
 if(path==='/bootstrap')return clone({shippingFeeSatang:shippingFeeSatang(memory.settings),content:memory.content,products:memory.products.filter(p=>p.active),posts:memory.posts.filter(p=>p.status==='published'),poll:memory.poll});
 if(path==='/checkout')throw Error('โหมดทดลองยังไม่รับชำระเงิน ต้องเชื่อม Firebase และ Stripe ก่อน');
 if(path==='/admin/import-bienvica'){
  const created=[],skipped=[];
  for(const product of bienvicaCatalog){
   if(memory.products.some(p=>p.id===product.id))skipped.push(product.id);
   else {memory.products.push(clone(product));created.push(product.id);}
  }
  persist();return {success:true,created,skipped};
 }
 if(path==='/admin/data')return clone({...memory,settings:{...memory.settings,shippingFeeSatang:shippingFeeSatang(memory.settings)}});
 if(path==='/admin/content'){memory.draft=clone(data.sections);if(data.publish)memory.content=clone(data.sections);}
 else if(path==='/admin/product'){const i=memory.products.findIndex(p=>p.id===data.id);if(i>=0)memory.products[i]=clone(data);else memory.products.push({...clone(data),id:crypto.randomUUID()});}
 else if(path==='/admin/settings')memory.settings={...clone(data),shippingPolicyVersion:SHIPPING_POLICY_VERSION};
 else if(path==='/posts'){memory.posts.unshift({...clone(data),id:crypto.randomUUID(),status:'pending',authorName:'สมาชิกตัวอย่าง',createdAt:new Date().toISOString()});}
 else if(path==='/admin/research-post'){const old=memory.posts.find(p=>p.id===data.id);const record={...normalizeResearchPost({...data,image:''}),image:data.image||'',id:old?.id||crypto.randomUUID(),authorName:'ทีมเบียงวิก้า',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};if(old)Object.assign(old,record);else memory.posts.unshift(record);}
 else if(path==='/admin/post'){memory.posts.unshift({...clone(data),id:crypto.randomUUID(),status:data.publish?'published':'draft',authorName:'ทีมจากสวนของเรา',createdAt:new Date().toISOString()});}
 else if(path==='/admin/moderate'){const p=memory[data.collection].find(p=>p.id===data.id);if(p)p.status=data.status;}
 else if(path.startsWith('/comments?'))return clone(memory.comments.filter(c=>c.postId===new URLSearchParams(path.split('?')[1]).get('postId')&&c.status==='published'));
 else if(path==='/comments'){memory.comments.push({...clone(data),id:crypto.randomUUID(),status:'pending',authorName:'สมาชิกตัวอย่าง'});}
 else if(path==='/vote'){memory.vote=data.option;}
 else if(path==='/admin/poll')memory.poll={...clone(data),active:true,id:crypto.randomUUID()};
 else if(path==='/admin/members')return[{uid:'demo',email:'',name:'ผู้ดูแลตัวอย่าง',admin:true,disabled:false}];
 else if(path==='/my-orders')return[];
 else if(!['/admin/content','/admin/product','/admin/settings'].includes(path))throw Error('ยังไม่มีข้อมูลส่วนนี้ในโหมดทดลอง');
 persist();return{success:true,status:'pending'};
}
