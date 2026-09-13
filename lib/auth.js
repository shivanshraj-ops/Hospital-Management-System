const jwt=require('jsonwebtoken');
const cookie=require('cookie');
const {q}=require('./db');
const {send}=require('./http');
const COOKIE='medicare_session';
function secret(){ const s=process.env.AUTH_SECRET; if(!s) throw new Error('Missing environment variable AUTH_SECRET'); return s; }
function token(user){ return jwt.sign({id:Number(user.id),username:user.username||'',fullName:user.full_name||user.fullName||'',email:user.email||'',role:user.role||'patient',age:user.age==null?null:Number(user.age),photo:user.photo||null,createdAt:user.created_at||user.createdAt||null,lastLogin:user.last_login||user.lastLogin||null},secret(),{expiresIn:'7d'}); }
function setCookie(res,t){ res.setHeader('Set-Cookie',cookie.serialize(COOKIE,t,{httpOnly:true,secure:process.env.NODE_ENV==='production'||!!process.env.VERCEL,sameSite:'lax',path:'/',maxAge:604800})); }
function clearCookie(res){ res.setHeader('Set-Cookie',cookie.serialize(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production'||!!process.env.VERCEL,sameSite:'lax',path:'/',maxAge:0,expires:new Date(0)})); }
function getToken(req){ const c=cookie.parse(req.headers.cookie||''); return c[COOKIE]||''; }
function current(req){ try{ const t=getToken(req); return t?jwt.verify(t,secret()):null; }catch{return null;} }
async function fresh(req){ const u=current(req); if(!u||!u.id) return null; const rows=await q('SELECT id, username, full_name, email, age, role, photo, created_at, last_login FROM users WHERE id=? LIMIT 1',[u.id]); return rows[0]||null; }
async function requireAuth(req,res,roles=null){ const u=await fresh(req); if(!u){ send(res,false,'Unauthorized. Please login to continue.',null,401); return null; } if(roles&&!roles.includes(u.role)){ send(res,false,'Forbidden. Administrator privileges required.',null,403); return null; } return u; }
module.exports={token,setCookie,clearCookie,current,fresh,requireAuth};
