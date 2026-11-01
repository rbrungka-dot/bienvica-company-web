import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeResearchPost,researchPosts,safeSourceURL} from '../shared/research.mjs';
const valid={category:'research',title:'ทดสอบสูตรจริง',summary:'คำโปรยภาษาไทย',body:'ผลในห้องปฏิบัติการ',publishedDate:'2026-10-31',image:'',publish:true};
test('research publishing validates source links, dates, content and image URLs',()=>{
 assert.equal(normalizeResearchPost(valid).status,'published');
 assert.equal(normalizeResearchPost({...valid,publish:false}).status,'draft');
 for(const sourceURL of ['javascript:alert(1)','http://example.test','https://user:pass@example.test'])assert.throws(()=>normalizeResearchPost({...valid,sourceURL}));
 assert.throws(()=>normalizeResearchPost({...valid,publishedDate:'2026-02-30'}));
 assert.throws(()=>normalizeResearchPost({...valid,image:'https://evil.test/image.png'}));
 assert.throws(()=>normalizeResearchPost({...valid,title:' '}));
 assert.equal(safeSourceURL('javascript:alert(1)'),'');
 assert.throws(()=>normalizeResearchPost({...valid,category:'facebook',sourceURL:'https://facebook.com.evil.test/post'}));
 assert.throws(()=>normalizeResearchPost({...valid,category:'facebook'}));
 assert.equal(normalizeResearchPost({...valid,category:'facebook',sourceURL:'https://www.facebook.com/Bienvica/posts/123'}).sourceURL,'https://www.facebook.com/Bienvica/posts/123');
});
test('public research library omits drafts and unrelated discussions, filters and sorts publications',()=>{
 const posts=[{...normalizeResearchPost(valid),id:'older',publishedDate:'2026-01-01'}, {...normalizeResearchPost({...valid,title:'กุหลาบ',category:'knowledge'}),id:'newest'}, {...normalizeResearchPost({...valid,publish:false}),id:'draft'}, {title:'กระทู้',status:'published',id:'discussion'}];
 assert.deepEqual(researchPosts(posts).map(p=>p.id),['newest','older']);
 assert.deepEqual(researchPosts(posts,{category:'knowledge',query:'กุหลาบ'}).map(p=>p.id),['newest']);
 assert.equal(researchPosts(posts,{query:'ไม่มีคำนี้'}).length,0);
});
