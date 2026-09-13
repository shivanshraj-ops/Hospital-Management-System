function body(req){ if(req.body && typeof req.body==='object') return req.body; try{return JSON.parse(req.body||'{}')}catch{return{}} }
function send(res, success, message='', data=null, status=200){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');
  const out={success,message}; if(data!==null) out.data=data; return res.status(status).json(out);
}
function fail(res, err){ console.error(err); const msg = err && err.code==='ER_DUP_ENTRY' ? 'A record with the same unique value already exists.' : 'Server or database error. Please verify the deployment environment variables and database connection.'; return send(res,false,msg,null,err&&err.code==='ER_DUP_ENTRY'?409:500); }
const emailOk = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||''));
const trim = v => String(v==null?'':v).trim();
module.exports={body,send,fail,emailOk,trim};
