import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { sections, products, posts } from '../shared/initial.mjs';
initializeApp({credential:process.env.FIREBASE_SERVICE_ACCOUNT_JSON?cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)):applicationDefault()});
const [command,value]=process.argv.slice(2),db=getFirestore();
if(command==='seed'){
 const docs=[['content/published',{sections}],['content/draft',{sections}],['settings/shop',{shippingFeeSatang:null}],...products.map(({id,...p})=>['products/'+id,p]),...posts.map(({id,...p})=>['posts/'+id,p])];
 for(const [path,data] of docs){const ref=db.doc(path);await db.runTransaction(async t=>{if(!(await t.get(ref)).exists)t.create(ref,data)});}
 console.log('Created missing starter records. Existing data was preserved. Prices and checkout remain disabled.');
}else if(command==='grant-admin'&&value){const u=await getAuth().getUserByEmail(value);await getAuth().setCustomUserClaims(u.uid,{...u.customClaims,admin:true});console.log('Administrator claim granted. Sign out and sign in again.');}
else{console.error('Usage: npm run admin -- seed | npm run admin -- grant-admin <email>');process.exitCode=1;}
