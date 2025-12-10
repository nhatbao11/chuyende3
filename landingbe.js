// server.js
// Full backend for LP -> fake missing fields -> save to Firestore
// Usage: node server.js (or pm2 start server.js --name lp-backend)
// Requires: npm i express cors firebase-admin dotenv

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import admin from 'firebase-admin';
import path from 'path';

dotenv.config();

// ====== Config ======
const PORT = process.env.PORT || 8080;
const SHARED_SECRET = process.env.N8N_SHARED_SECRET || process.env.SHARED_SECRET || '';
const SERVICE_ACCOUNT_ENV = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';

// *** HẰNG SỐ MỚI CHO CHỨC NĂNG ĐẾM TRAFFIC ***
// Thay thế giá trị này bằng ID document đếm mà bạn đã tạo trong collection 'traffic'
const TRAFFIC_COUNT_DOC_ID = 'WAG1XG5RXM60Ww63widr'; 

if (!SERVICE_ACCOUNT_ENV) {
  console.error('ERROR: GOOGLE_APPLICATION_CREDENTIALS not set in env. Provide path or raw JSON.');
  process.exit(1);
}

// Helper: load service account: allow path or raw JSON string
let serviceAccount;
try {
  if (SERVICE_ACCOUNT_ENV.trim().startsWith('{')) {
    // raw JSON in env var
    serviceAccount = JSON.parse(SERVICE_ACCOUNT_ENV);
  } else {
    // treat as file path
    const p = path.resolve(SERVICE_ACCOUNT_ENV);
    const raw = fs.readFileSync(p, 'utf8');
    serviceAccount = JSON.parse(raw);
  }
} catch (err) {
  console.error('Failed to load service account JSON:', err);
  process.exit(1);
}

// init firebase admin
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json({ limit: '300kb' }));

// ====== Utility helpers ======
const randStr = (len = 6) => Math.random().toString(36).substring(2, 2 + len);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const safeTrim = (v) => (typeof v === 'string' ? v.trim() : v);

// Lists for fake values
const UTM_SOURCES = ['facebook', 'tiktok', 'youtube'];
const UTM_MEDIUMS = ['cpc', 'social', 'email', 'referral', 'organic'];
const UTM_CAMPAIGNS = ['spring_sale', 'summer_push'];
const UTM_TERMS = ['investing', 'finance', 'startup', 'learning', 'growth'];
const UTM_CONTENTS = ['banner1', 'video_ad', 'ebook_cta', 'influencer_post'];
const REFERRERS = [
  'https://facebook.com/ad1',
  'https://tiktok.com/',
  'https://google.com/search?q=invest',
  'https://youtube.com/watch?v=abc123',
  'https://linkedin.com/feed/'
];
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/... Chrome/117.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/... Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0'
];

function stripEmpty(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (typeof v === 'object') {
      const cleaned = stripEmpty(v);
      if (typeof cleaned === 'object' && Object.keys(cleaned).length === 0) continue;
      out[k] = cleaned;
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Fill fake fields for any missing/empty values
function fillFakeFields(payload = {}, ipFromReq = '') {
  const out = { ...payload };

  // Ensure basic strings
  out.email = safeTrim(out.email || '');
  out.name = safeTrim(out.name || '');

  // UTM group (always produce object with values)
  out.utm = {
    source: safeTrim(out.utm?.source || out.utm_source || pick(UTM_SOURCES)),
    medium: safeTrim(out.utm?.medium || out.utm_medium || pick(UTM_MEDIUMS)),
    campaign: safeTrim(out.utm?.campaign || out.utm_campaign || pick(UTM_CAMPAIGNS)),
    term: safeTrim(out.utm?.term || out.utm_term || pick(UTM_TERMS)),
    content: safeTrim(out.utm?.content || out.utm_content || pick(UTM_CONTENTS)),
  };

  // Click IDs
  out.gclid = safeTrim(out.gclid || `GCLID-${randStr(6)}`);
  out.fbclid = safeTrim(out.fbclid || `FBCLID-${randStr(6)}`);
  out.ttclid = safeTrim(out.ttclid || `TTCLID-${randStr(6)}`);

  // IDs
  out.ids = {
    client_id: safeTrim(out.client_id || out.ids?.client_id || `CID-${randStr(8)}`),
    session_id: safeTrim(out.session_id || out.ids?.session_id || `SID-${randStr(8)}`),
  };

  // Context
  out.context = {
    referrer: safeTrim(out.referrer || out.context?.referrer || pick(REFERRERS)),
    user_agent: safeTrim(out.user_agent || out.context?.user_agent || pick(USER_AGENTS)),
    source_ip: safeTrim(out.source_ip || ipFromReq || ''),
  };

  // Final lead object to store
  const lead = {
    email: out.email.toLowerCase(),
    name: out.name || `User-${randStr(4)}`,
    consent: !!out.consent,
    source_lp: safeTrim(out.source_lp || out.source || 'landingpage_demo'),
    utm: out.utm,
    ids: out.ids,
    context: out.context,
    meta: out.meta || {},
  };

  // Strip empties inside the lead
  return stripEmpty(lead);
}

// ====== Auth middleware ======
function requireAuth(req, res, next) {
  const auth = req.header('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const token = auth.slice(7);
  if (!token || token !== SHARED_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}

// ====== Routes ======

// Health
app.get('/_health', (_req, res) => res.json({ ok: true }));

// *** ROUTE MỚI: Log Traffic (Chỉ Đếm) ***
app.post('/traffic/log', async (req, res) => {
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    // Tham chiếu đến document đếm duy nhất trong collection 'traffic'
    const countRef = db.collection('traffic').doc(TRAFFIC_COUNT_DOC_ID);

    // THAO TÁC NGUYÊN TỬ: Tăng count lên 1
    await countRef.set({
      count: admin.firestore.FieldValue.increment(1),
      updated_at: now, // Cập nhật thời gian lần cuối đếm
    }, { merge: true }); // Dùng merge để không ghi đè các trường khác

    return res.status(200).json({ status: 'ok', logged: true });

  } catch (err) {
    console.error('traffic count error', err);
    // Trả về 204 ngay cả khi lỗi để không ảnh hưởng đến frontend
    return res.status(204).send(); 
  }
});


// Main: check or create lead
app.post('/leads/check-or-create', requireAuth, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '';
    const payload = req.body || {};

    // Basic validation: require email provided (frontend should supply)
    if (!payload.email || String(payload.email).trim() === '') {
      return res.status(400).json({ status: 'error', reason: 'missing_email', message: 'missing email' });
    }

    // Fill fake fields
    const leadDoc = fillFakeFields(payload, ip);

    // Debug log (so you can check pm2 logs)
    console.log('[LEAD after fake] =>', JSON.stringify(leadDoc, null, 2));

    // Basic email format validation
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(leadDoc.email)) {
      return res.status(400).json({
        status: 'error',
        reason: 'invalid_email',
        message: 'email không đúng định dạng.'
      });
    }

    // Firestore: check existing by email
    const leadsRef = db.collection('leads');
    const q = await leadsRef.where('email', '==', leadDoc.email).limit(1).get();
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (!q.empty) {
      // Update existing (merge)
      const existing = q.docs[0];
      await existing.ref.set({
        ...leadDoc,
        updated_at: now
      }, { merge: true });

      return res.status(200).json({
        status: 'ok',
        created: false,
        reason: 'duplicate',
        message: 'Email đã tồn tại.'
      });
    }

    // Create new document
    const newRef = leadsRef.doc();
    await newRef.set({
      ...leadDoc,
      status: 'NEW',
      score: 0,
      created_at: now,
      updated_at: now,
      _source: 'lp-backend'
    });

    return res.status(200).json({ status: 'ok', created: true });

  } catch (err) {
    console.error('lead error', err);
    return res.status(500).json({ status: 'error', reason: 'server_error', message: 'internal server error' });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`LP Backend running on port ${PORT}`);
});