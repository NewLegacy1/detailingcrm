/**
 * DetailOps Blog Post Generator
 *
 * Usage:
 *   node scripts/generate-post.mjs            — generate one new post
 *   node scripts/generate-post.mjs --backfill  — build static HTML for all existing posts (no AI call)
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

try { const d = await import('dotenv'); d.default.config(); } catch {}

const __filename = fileURLToPath(import.meta.url);
const ROOT       = path.join(path.dirname(__filename), '..');
const POSTS_FILE = path.join(ROOT, 'posts.json');
const POSTS_DIR  = path.join(ROOT, 'posts');
const SITE_URL   = (process.env.SITE_URL || 'https://detailops.io').replace(/\/$/, '');

// ---------------------------------------------------------------------------
// Topic pool
// ---------------------------------------------------------------------------
const TOPICS = [
  'How to price your auto detailing services to stop leaving money on the table',
  'The ultimate guide to reducing no-shows for your detailing business',
  'How to get your first 50 detailing clients without paid ads',
  'Mobile detailing vs. shop-based detailing: pros, cons, and how to decide',
  'How to build a recurring client base that books you out months in advance',
  'The detailer\'s guide to ceramic coating: pricing, upsells, and client expectations',
  'How to write a detailing service menu that converts browsers into buyers',
  'Instagram marketing for auto detailers: what actually works',
  'Why you should require deposits for every detailing appointment',
  'How to follow up with past detailing clients and win repeat business',
  'How to stand out in a saturated detailing market',
  'Paint correction pricing: how to charge what your work is worth',
  'How to create a professional detailing booking page that books clients 24/7',
  'Google Business Profile optimization tips for auto detailers',
  'How to raise your detailing prices without losing clients',
  'Seasonal detailing packages: how to boost revenue during slow months',
  'How to get more 5-star Google reviews for your detailing business',
  'Upselling strategies that increase the average detailing ticket',
  'How to handle difficult detailing clients professionally',
  'Fleet detailing contracts: create reliable monthly recurring revenue',
  'How to turn one-time clients into loyal regulars for your detailing business',
  'The business case for adding paint protection film to your service menu',
  'How to use before-and-after photos to grow your detailing business on social media',
  'Cash flow management basics for detailing business owners',
  'How to hire and train your first detailing employee without slowing down',
];

// ---------------------------------------------------------------------------
// Category colour map (used in templates)
// ---------------------------------------------------------------------------
const CAT = {
  'Business Tips':    { bg: 'rgba(0,184,245,0.12)',   text: '#00b8f5', border: 'rgba(0,184,245,0.28)' },
  'Marketing':        { bg: 'rgba(0,212,126,0.12)',   text: '#00d47e', border: 'rgba(0,212,126,0.28)' },
  'Operations':       { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', border: 'rgba(245,158,11,0.28)' },
  'Pricing':          { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa', border: 'rgba(167,139,250,0.28)' },
  'Client Relations': { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.28)' },
};
function catStyle(cat) {
  const c = CAT[cat] || CAT['Business Tips'];
  return `background:${c.bg};color:${c.text};border:1px solid ${c.border}`;
}
function catColor(cat) {
  return (CAT[cat] || CAT['Business Tips']).text;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pickTopic(existingPosts) {
  const used = new Set(existingPosts.map(p => p.topic).filter(Boolean));
  const pool = TOPICS.filter(t => !used.has(t));
  return (pool.length > 0 ? pool : TOPICS)[Math.floor(Math.random() * (pool.length || TOPICS.length))];
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}

function esc(str = '') {
  return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function loadPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8')); }
  catch { return []; }
}

// ---------------------------------------------------------------------------
// Static post page builder
// ---------------------------------------------------------------------------
function buildPostPage(post, allPosts) {
  const related = allPosts
    .filter(p => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': post.title,
    'description': post.excerpt,
    'datePublished': post.date,
    'dateModified': post.date,
    'author': { '@type': 'Organization', 'name': 'DetailOps', 'url': SITE_URL },
    'publisher': {
      '@type': 'Organization',
      'name': 'DetailOps',
      'url': SITE_URL,
      'logo': { '@type': 'ImageObject', 'url': `${SITE_URL}/logo.png` },
    },
    'url': `${SITE_URL}/posts/${post.slug}.html`,
    'mainEntityOfPage': { '@type': 'WebPage', '@id': `${SITE_URL}/posts/${post.slug}.html` },
    'keywords': post.category,
  });

  const relatedHTML = related.length === 0 ? '' : `
<section class="related-sec">
  <h3 class="related-title">More from the Blog</h3>
  <div class="related-grid">
    ${related.map(r => `
    <a class="related-card" href="${r.slug}.html">
      <span class="related-cat" style="color:${catColor(r.category)}">${r.category}</span>
      <div class="related-card-title">${esc(r.title)}</div>
      <div class="related-meta">${fmtDate(r.date)} · ${r.readTime}</div>
    </a>`).join('')}
  </div>
</section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(post.title)} — DetailOps Blog</title>
<meta name="description" content="${esc(post.excerpt)}">
<link rel="canonical" href="${SITE_URL}/posts/${post.slug}.html">
<meta property="og:type" content="article">
<meta property="og:site_name" content="DetailOps">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(post.excerpt)}">
<meta property="og:url" content="${SITE_URL}/posts/${post.slug}.html">
<meta property="article:published_time" content="${post.date}">
<meta property="article:section" content="${esc(post.category)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(post.title)}">
<meta name="twitter:description" content="${esc(post.excerpt)}">
<script type="application/ld+json">${jsonLd}</script>
<link href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300&family=Fraunces:ital,wght@1,300;1,400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07090c;--surface:#0c1018;--card:#101620;--card2:#0d1319;
  --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.04);
  --white:#eef0f2;--muted:#64748b;--muted2:#3d4f5e;
  --accent:#00b8f5;--accent-dim:rgba(0,184,245,0.07);
  --green:#00d47e;--amber:#f59e0b;
  --font:'Figtree',sans-serif;--font-serif:'Fraunces',Georgia,serif;
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--white);font-family:var(--font);font-weight:300;overflow-x:hidden;-webkit-font-smoothing:antialiased}
body::after{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:9999;opacity:.5}
/* NAV */
nav{position:fixed;top:0;left:0;right:0;z-index:500;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;background:rgba(7,9,12,.85);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--border)}
.logo{display:flex;align-items:center;gap:9px;font-family:var(--font);font-weight:700;font-size:16px;color:var(--white);text-decoration:none;letter-spacing:-.2px}
.logo-mark{width:26px;height:26px;background:var(--accent);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#000}
.logo-ops{color:var(--accent)}
nav ul{position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:28px;list-style:none}
nav ul a{font-size:13.5px;font-weight:400;color:var(--muted);text-decoration:none;transition:color .2s}
nav ul a:hover,nav ul a.active{color:var(--white)}
.nav-r{display:flex;gap:10px;align-items:center}
.nav-login{font-size:13.5px;font-weight:400;color:var(--muted);text-decoration:none;padding:7px 14px;transition:color .2s}
.nav-login:hover{color:var(--white)}
.nav-cta{background:var(--accent);color:#000;font-family:var(--font);font-size:13px;font-weight:700;padding:9px 20px;border-radius:8px;text-decoration:none;transition:all .2s}
.nav-cta:hover{background:#33c9ff;transform:translateY(-1px)}
.nav-toggle{display:none;flex-direction:column;justify-content:center;gap:5px;width:44px;height:44px;padding:10px;background:transparent;border:1px solid var(--border);border-radius:8px;cursor:pointer;z-index:502}
.nav-toggle span{display:block;height:2px;background:var(--white);border-radius:1px;transition:transform .25s,opacity .25s}
.nav-toggle[aria-expanded="true"] span:nth-child(1){transform:translateY(7px) rotate(45deg)}
.nav-toggle[aria-expanded="true"] span:nth-child(2){opacity:0}
.nav-toggle[aria-expanded="true"] span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
/* POST VIEW */
.post-view{max-width:760px;margin:0 auto;padding:90px 40px 100px}
.post-back{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:500;color:var(--muted);text-decoration:none;margin-bottom:36px;background:none;border:none;cursor:pointer;font-family:var(--font);padding:0;transition:color .2s}
.post-back:hover{color:var(--white)}
.post-back svg{transition:transform .15s}
.post-back:hover svg{transform:translateX(-3px)}
.post-header{margin-bottom:40px}
.cat-pill{display:inline-flex;align-items:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 10px;border-radius:100px;margin-bottom:18px}
.post-header h1{font-family:var(--font);font-size:clamp(26px,4vw,42px);font-weight:800;letter-spacing:-1px;line-height:1.15;margin-bottom:18px;color:var(--white)}
.post-header-meta{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--muted2)}
.meta-dot{width:3px;height:3px;border-radius:50%;background:var(--muted2)}
.post-content{font-size:15.5px;font-weight:300;line-height:1.8;color:#bcc8d4;border-top:1px solid var(--border2);padding-top:40px;margin-bottom:56px}
.post-content h2{font-family:var(--font);font-size:clamp(19px,3vw,25px);font-weight:700;letter-spacing:-.5px;color:var(--white);line-height:1.25;margin:40px 0 14px}
.post-content h2:first-child{margin-top:0}
.post-content h3{font-family:var(--font);font-size:17px;font-weight:700;color:var(--white);line-height:1.3;margin:30px 0 10px}
.post-content p{margin-bottom:18px}
.post-content p:last-child{margin-bottom:0}
.post-content ul,.post-content ol{padding-left:22px;margin-bottom:18px}
.post-content li{margin-bottom:7px}
.post-content strong{color:var(--white);font-weight:600}
.post-content em{font-style:italic}
/* CTA BOX */
.post-cta{background:var(--surface);border:1px solid var(--border);border-top:2px solid var(--accent);border-radius:14px;padding:32px 36px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:64px}
.post-cta-text h3{font-size:17px;font-weight:700;margin-bottom:6px;color:var(--white)}
.post-cta-text p{font-size:13.5px;color:var(--muted);line-height:1.6;max-width:380px}
.post-cta-btn{background:var(--accent);color:#000;font-family:var(--font);font-size:13.5px;font-weight:700;padding:12px 26px;border-radius:9px;text-decoration:none;white-space:nowrap;transition:all .2s;flex-shrink:0}
.post-cta-btn:hover{background:#33c9ff;transform:translateY(-1px)}
/* RELATED */
.related-sec{margin-bottom:64px}
.related-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted2);margin-bottom:18px}
.related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.related-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:8px;transition:border-color .2s,transform .2s}
.related-card:hover{border-color:rgba(0,184,245,.2);transform:translateY(-2px)}
.related-cat{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.related-card-title{font-size:13.5px;font-weight:700;color:var(--white);line-height:1.35}
.related-meta{font-size:11px;color:var(--muted2)}
/* FOOTER */
footer{background:var(--surface);border-top:1px solid var(--border);padding:32px 40px;display:flex;align-items:center;justify-content:space-between}
.foot-copy{font-size:12.5px;color:var(--muted2)}
.foot-links{display:flex;gap:24px}
.foot-links a{font-size:12.5px;color:var(--muted2);text-decoration:none;transition:color .2s}
.foot-links a:hover{color:var(--muted)}
/* MOBILE */
@media(max-width:768px){
  nav{padding:0 16px}
  .nav-toggle{display:flex}
  nav ul{position:fixed;top:0;left:0;right:0;bottom:0;background:var(--bg);flex-direction:column;align-items:center;justify-content:center;gap:8px;transform:none;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .25s,visibility .25s;z-index:501}
  nav ul.is-open{opacity:1;visibility:visible;pointer-events:auto}
  nav ul a{font-size:18px;padding:12px 20px}
  .nav-r .nav-login{display:none}
  .post-view{padding:80px 20px 60px}
  .post-content{font-size:15px}
  .post-cta{padding:24px 22px;flex-direction:column}
  .post-cta-btn{width:100%;text-align:center}
  .related-grid{grid-template-columns:1fr;gap:10px}
  footer{flex-direction:column;gap:20px;padding:28px 20px;text-align:center}
  .foot-links{flex-wrap:wrap;justify-content:center;gap:16px}
}
</style>
</head>
<body>
<nav>
  <a class="logo" href="../index.html">
    <div class="logo-mark">D</div>
    Detail<span class="logo-ops">Ops</span>
  </a>
  <button type="button" class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="post-nav-menu">
    <span></span><span></span><span></span>
  </button>
  <ul id="post-nav-menu">
    <li><a href="../index.html#features">Features</a></li>
    <li><a href="../index.html#pricing">Pricing</a></li>
    <li><a href="../index.html#how">How It Works</a></li>
    <li><a href="../blog.html" class="active">Blog</a></li>
  </ul>
  <div class="nav-r">
    <a class="nav-login" href="#">Log in</a>
    <a class="nav-cta" href="../onboarding.html">Get Started Free</a>
  </div>
</nav>

<div class="post-view">
  <a class="post-back" href="../blog.html">
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10 6.5H3M6 3.5L3 6.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    Back to Blog
  </a>
  <div class="post-header">
    <span class="cat-pill" style="${catStyle(post.category)}">${esc(post.category)}</span>
    <h1>${esc(post.title)}</h1>
    <div class="post-header-meta">
      <span>${fmtDate(post.date)}</span>
      <span class="meta-dot"></span>
      <span>${esc(post.readTime)}</span>
    </div>
  </div>
  <div class="post-content">${post.content}</div>
  <div class="post-cta">
    <div class="post-cta-text">
      <h3>Stop chasing bookings. Start scaling.</h3>
      <p>DetailOps gives auto detailers a professional booking page, deposit collection, automated reminders, and client management — all in one place.</p>
    </div>
    <a class="post-cta-btn" href="../onboarding.html">Start Free — 14 Days</a>
  </div>
  ${relatedHTML}
</div>

<footer>
  <a class="logo" href="../index.html">
    <div class="logo-mark">D</div>
    Detail<span class="logo-ops">Ops</span>
  </a>
  <div class="foot-copy">© 2025 DetailOps. Built for detailers, by people who get it.</div>
  <div class="foot-links">
    <a href="../privacy.html">Privacy</a>
    <a href="../terms.html">Terms</a>
    <a href="#">Support</a>
    <a href="../blog.html">Blog</a>
  </div>
</footer>

<script>
const navMenu = document.getElementById('post-nav-menu');
const navToggle = document.querySelector('.nav-toggle');
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const open = navMenu.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  navMenu.querySelectorAll('a').forEach(l => l.addEventListener('click', () => {
    navMenu.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }));
}
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Sitemap builder
// ---------------------------------------------------------------------------
function buildSitemap(posts) {
  const urls = [
    { loc: `${SITE_URL}/index.html`,   changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/blog.html`,    changefreq: 'daily',  priority: '0.9' },
    ...posts.map(p => ({
      loc: `${SITE_URL}/posts/${p.slug}.html`,
      changefreq: 'never',
      priority: '0.7',
      lastmod: p.date,
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;
}

// ---------------------------------------------------------------------------
// Write static page + update sitemap
// ---------------------------------------------------------------------------
function writeStaticFiles(posts) {
  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR);
  for (const post of posts) {
    const dest = path.join(POSTS_DIR, `${post.slug}.html`);
    fs.writeFileSync(dest, buildPostPage(post, posts), 'utf8');
    console.log(`   ↳ posts/${post.slug}.html`);
  }
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(posts), 'utf8');
  console.log('   ↳ sitemap.xml');
}

// ---------------------------------------------------------------------------
// Backfill mode: rebuild static pages for all existing posts, no AI call
// ---------------------------------------------------------------------------
if (process.argv.includes('--backfill')) {
  const posts = loadPosts();
  if (posts.length === 0) {
    console.log('No posts in posts.json to backfill.');
    process.exit(0);
  }
  console.log(`\n🔄  Backfilling static pages for ${posts.length} post(s)...\n`);
  writeStaticFiles(posts);
  console.log(`\n✅  Done.\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Generate new post via OpenAI
// ---------------------------------------------------------------------------
async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('\n❌  OPENAI_API_KEY not set. Add it to your .env file.\n');
    process.exit(1);
  }

  const posts = loadPosts();
  const topic = pickTopic(posts);
  console.log(`\n[${new Date().toISOString()}] 🖊  Topic: "${topic}"\n`);

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.75,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You write SEO-optimized blog posts for DetailOps — a booking and CRM platform built for auto detailers. ' +
          'Tone: warm, practical, encouraging — like a knowledgeable colleague, not a marketer. ' +
          'SEO rules: (1) include the primary keyword phrase naturally in the first paragraph, ' +
          '(2) use the keyword or a close variation in at least one h2, ' +
          '(3) use semantically related terms throughout, ' +
          '(4) write for a specific reader: a solo mobile detailer or small shop owner who is busy and wants real advice. ' +
          'DetailOps features to reference naturally where relevant: shareable professional booking page, ' +
          'deposit collection via Stripe (money goes directly to the detailer), ' +
          'automated SMS and email reminders, client history and vehicle notes, bookings dashboard. ' +
          'End every post with a 2-3 sentence paragraph tying back to DetailOps, then a single CTA sentence.',
      },
      {
        role: 'user',
        content:
          `Topic: "${topic}"\n\n` +
          'Structure:\n' +
          '1. Opening paragraph (2-3 sentences): frame the problem/opportunity; include the keyword phrase naturally\n' +
          '2. One transition sentence introducing the numbered tips\n' +
          '3. 5–7 numbered sections, each:\n' +
          '   - <h2> like "1. Do the Thing" (include keyword variation where natural)\n' +
          '   - 2-3 short paragraphs OR a paragraph + a <ul> bullet list\n' +
          '   - Specific, actionable advice — no generic filler\n' +
          '4. Closing paragraph: 2-3 sentences, natural DetailOps mention\n' +
          '5. CTA sentence: one clear sentence\n\n' +
          'Style: short sentences, conversational, no jargon, no corporate fluff.\n\n' +
          'Return JSON with EXACTLY these fields:\n' +
          '{"title":"50-65 chars, include primary keyword","slug":"url-friendly-slug",' +
          '"excerpt":"140-155 chars meta description — specific and compelling, not generic",' +
          '"category":"Business Tips|Marketing|Operations|Pricing|Client Relations",' +
          '"readTime":"X min read","content":"HTML with h2/p/ul/li/strong only, 750-1000 words"}',
      },
    ],
  });

  let raw = completion.choices[0].message.content.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let data;
  try { data = JSON.parse(raw); }
  catch {
    console.error('❌  Could not parse OpenAI response. Raw (first 300 chars):\n', raw.slice(0, 300));
    process.exit(1);
  }

  const post = {
    id:       crypto.randomUUID(),
    topic,
    date:     new Date().toISOString().split('T')[0],
    color:    (CAT[data.category] || CAT['Business Tips']).text,
    title:    data.title,
    slug:     data.slug,
    excerpt:  data.excerpt,
    category: data.category,
    readTime: data.readTime,
    content:  data.content,
  };

  posts.unshift(post);
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');

  console.log('📄  Writing static files...');
  writeStaticFiles(posts);

  console.log(`\n✅  Done!`);
  console.log(`    Title    : "${post.title}"`);
  console.log(`    Category : ${post.category}`);
  console.log(`    URL      : ${SITE_URL}/posts/${post.slug}.html\n`);
}

main().catch(err => { console.error('\n❌ ', err.message); process.exit(1); });
