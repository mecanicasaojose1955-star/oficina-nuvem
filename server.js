// ===== Oficina na Nuvem — servidor simples (Node + Express) =====
// Guarda todos os dados em data/db.json e serve o painel em /public.
const express = require('express');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE  = path.join(DATA_DIR, 'db.json');
const SEED     = path.join(__dirname, 'seed.json');

app.use(express.json({ limit: '25mb' }));

// serve a tela do painel (arquivo unico index.html na raiz)
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

function sha256(s){ return crypto.createHash('sha256').update(String(s)).digest('hex'); }

function ensureDB(){
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if(!fs.existsSync(DB_FILE)) fs.copyFileSync(SEED, DB_FILE);
}
function readDB(){ ensureDB(); return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(db){
  // troca senhaPlain (texto puro) por senhaHash antes de gravar
  if(Array.isArray(db.usuarios)){
    db.usuarios.forEach(u=>{
      if(u && typeof u.senhaPlain === 'string' && u.senhaPlain){
        u.senhaHash = sha256(u.senhaPlain);
        delete u.senhaPlain;
      }
    });
  }
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
  return db;
}

// ---- sessões (em memória) ----
const tokens = new Map(); // token -> { userId, exp }
const TTL = 1000 * 60 * 60 * 12; // 12 horas
function newToken(userId){
  const t = crypto.randomBytes(24).toString('hex');
  tokens.set(t, { userId, exp: Date.now() + TTL });
  return t;
}
function auth(req, res, next){
  const h = req.headers['authorization'] || '';
  const t = h.replace(/^Bearer\s+/i, '');
  const s = tokens.get(t);
  if(!s || s.exp < Date.now()){ tokens.delete(t); return res.status(401).json({ erro: 'sessao' }); }
  req.userId = s.userId;
  next();
}

// ---- login ----
app.post('/api/login', (req, res) => {
  const { login, senha } = req.body || {};
  if(!login || !senha) return res.status(400).json({ erro: 'dados' });
  const db = readDB();
  const hash = sha256(senha);
  const user = (db.usuarios || []).find(u =>
    (u.login || '').toLowerCase() === String(login).toLowerCase() && u.senhaHash === hash);
  if(!user) return res.status(401).json({ erro: 'invalido' });
  res.json({ token: newToken(user.id), userId: user.id });
});

// ---- dados ----
app.get('/api/data', auth, (req, res) => { res.json(readDB()); });
app.put('/api/data', auth, (req, res) => {
  const db = req.body;
  if(!db || typeof db !== 'object' || !Array.isArray(db.usuarios))
    return res.status(400).json({ erro: 'formato' });
  writeDB(db);
  res.json({ ok: true });
});

// ---- restaurar demo (só admin) ----
app.post('/api/reset', auth, (req, res) => {
  const db = readDB();
  const me = (db.usuarios || []).find(u => u.id === req.userId);
  if(!me || me.perfil !== 'Administrador') return res.status(403).json({ erro: 'permissao' });
  fs.copyFileSync(SEED, DB_FILE);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log('Oficina na Nuvem rodando na porta ' + PORT);
});
