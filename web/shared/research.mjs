// Public-facing research posts share the existing moderated posts collection.
export const researchCategories = { research: 'งานวิจัย', knowledge: 'ความรู้และการพัฒนา', facebook: 'จาก Facebook' };
export function safeSourceURL(value = '') {
  try { const url = new URL(String(value).trim()); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function isFacebookURL(value) {
  const safe = safeSourceURL(value); if (!safe) return false;
  const host = new URL(safe).hostname;
  return host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch';
}
export function normalizeResearchPost(input) {
  const bounded = (value, max, required = false) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if ((required && !text) || text.length > max) throw Error('กรุณากรอกเนื้อหาให้ครบและไม่เกินความยาวที่กำหนด');
    return text;
  };
  const category = input.category;
  if (!Object.hasOwn(researchCategories, category)) throw Error('หมวดเนื้อหาไม่ถูกต้อง');
  const rawURL = bounded(input.sourceURL, 2000), sourceURL = safeSourceURL(rawURL);
  if ((rawURL && !sourceURL) || (category === 'facebook' && !isFacebookURL(sourceURL))) throw Error(category === 'facebook' ? 'กรุณาใช้ลิงก์ HTTPS ของโพสต์ Facebook หรือ fb.watch' : 'ลิงก์อ้างอิงต้องขึ้นต้นด้วย https://');
  const publishedDate = bounded(input.publishedDate, 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedDate) || Number.isNaN(Date.parse(publishedDate)) || new Date(publishedDate).toISOString().slice(0,10) !== publishedDate) throw Error('วันที่เผยแพร่ไม่ถูกต้อง');
  const image = bounded(input.image, 2000);
  if (image && !/^\/assets\/[\w.-]+$/.test(image) && !/^https:\/\/firebasestorage\.googleapis\.com\//.test(image)) throw Error('กรุณาอัปโหลดภาพผ่านช่องรูปภาพ');
  return { placement: 'research', kind: 'team', brand: 'Bienvica', category,
    title: bounded(input.title, 200, true), summary: bounded(input.summary, 500, true),
    body: bounded(input.body, 12000, true), sourceURL, sourceLabel: bounded(input.sourceLabel, 300), image,
    publishedDate, status: input.publish === true ? 'published' : 'draft' };
}
export function researchPosts(posts, { category = 'all', query = '' } = {}) {
  const needle = query.trim().toLocaleLowerCase('th');
  return posts.filter(p => p.placement === 'research' && p.status === 'published')
    .filter(p => category === 'all' || p.category === category)
    .filter(p => !needle || `${p.title} ${p.summary || ''} ${p.body}`.toLocaleLowerCase('th').includes(needle))
    .sort((a,b) => String(b.publishedDate || b.createdAt).localeCompare(String(a.publishedDate || a.createdAt)));
}
