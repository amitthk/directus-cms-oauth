import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Simple session (Directus session cookie)
function requireAuth(req, res, next) {
  const token = req.cookies['directus_session'];
  if (!token) return res.redirect('/login');
  next();
}

// Sidebar data for all pages
async function fetchPagesTree(req) {
  const { data } = await axios.get(
    `${DIRECTUS_URL}/items/pages?fields=id,title,slug,parent,order&limit=-1`
  );
  const pages = data?.data || [];
  // Build simple tree
  const byParent = new Map();
  pages.forEach(p => {
    const pid = p.parent || null;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(p);
  });
  // sort by order/title
  for (const arr of byParent.values()) {
    arr.sort((a,b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
  }
  function build(pid = null) {
    return (byParent.get(pid) || []).map(n => ({ ...n, children: build(n.id) }));
  }
  return build(null);
}

// Routes
app.get('/', async (req, res) => {
  const tree = await fetchPagesTree(req).catch(() => []);
  res.render('index', { tree, user: req.cookies['user_email'] || null });
});

app.get('/p/:slug', async (req, res) => {
  const slug = req.params.slug;
  const { data } = await axios.get(
    `${DIRECTUS_URL}/items/pages?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1&fields=*,parent.*`
  );
  const page = (data?.data || [])[0];
  const tree = await fetchPagesTree(req).catch(() => []);
  if (!page) return res.status(404).send('Not Found');
  res.render('page', { page, tree, user: req.cookies['user_email'] || null });
});

// Auth
app.get('/login', (req, res) => {
  // Kick off Google login at Directus (session mode)
  const redirectBack = `${APP_PUBLIC_URL}/auth/callback`;
  return res.redirect(`${DIRECTUS_URL}/auth/login/google?redirect=${encodeURIComponent(redirectBack)}`);
});

// Directus will redirect back to this path with its own session cookie set (HttpOnly) if same-site is OK.
// To make it visible here across ports, one common pattern is proxying via the same domain, or read
// user info via /users/me and store an app cookie with basic info.
app.get('/auth/callback', async (req, res) => {
  try {
    // Fetch /users/me via Directus to get the user email (browser carries Directus session cookie)
    const me = await axios.get(`${DIRECTUS_URL}/users/me`, { withCredentials: true, headers: { cookie: req.headers.cookie || '' } });
    const email = me?.data?.data?.email;
    if (email) {
      res.cookie('user_email', email, { httpOnly: false }); // just to show name in UI
      return res.redirect('/');
    }
  } catch (e) {
    // fallthrough
  }
  return res.redirect('/login');
});

app.get('/logout', async (req, res) => {
  try {
    await axios.post(`${DIRECTUS_URL}/auth/logout`, {}, { headers: { cookie: req.headers.cookie || '' } });
  } catch {}
  // Clear our own lightweight cookie (Directus session cookie clearing is handled by API)
  res.clearCookie('user_email');
  return res.redirect('/');
});

app.listen(process.env.APP_PORT || 3000, () => {
  console.log('Frontend running on port', process.env.APP_PORT || 3000);
});
