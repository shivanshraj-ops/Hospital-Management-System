const bcrypt=require('bcryptjs');
const crypto=require('crypto');
const {q}=require('./db');
const {body,send,fail,emailOk,trim}=require('./http');
const auth=require('./auth');

const normHash=h=>String(h||'').replace(/^\$2y\$/,'$2b$');
const idNum=id=>Number(String(id||'').replace(/\D/g,''))||0;
async function nextId(table,prefix){ const rows=await q(`SELECT id FROM ${table} WHERE id LIKE ?`,[prefix+'%']); const n=rows.reduce((m,r)=>Math.max(m,idNum(r.id)),0)+1; return prefix+String(n).padStart(3,'0'); }
const userPayload=u=>({id:Number(u.id),username:u.username||'',fullName:u.full_name||u.fullName||'',email:u.email,age:u.age==null?null:Number(u.age),role:u.role,photo:u.photo||null,createdAt:u.created_at||u.createdAt||null,lastLogin:u.last_login||u.lastLogin||null});

async function login(req,res){ try{ if(req.method!=='POST')return send(res,false,'Method not allowed. Use POST.',null,405); const d=body(req), ident=trim(d.username||d.email||d.identifier), pw=d.password||''; if(!ident)return send(res,false,'Username or email is required.',null,400); if(!pw)return send(res,false,'Password is required.',null,400); const rows=await q('SELECT * FROM users WHERE LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?) LIMIT 1',[ident,ident]); const u=rows[0]; if(!u||!(await bcrypt.compare(pw,normHash(u.password))))return send(res,false,'Invalid credentials. Please check your username/email and password.',null,401); await q('UPDATE users SET last_login=NOW() WHERE id=?',[u.id]); u.last_login=new Date().toISOString(); const p=userPayload(u); auth.setCookie(res,auth.token(p)); return send(res,true,'Welcome back, '+u.full_name+'!',{user:p}); }catch(e){return fail(res,e);} }

async function signup(req,res){ try{ if(req.method!=='POST')return send(res,false,'Method not allowed. Use POST.',null,405); const d=body(req), full=trim(d.fullName||d.full_name), email=trim(d.email||d.suEmail), age=d.age!=null?Number(d.age):Number(d.suAge), pw=d.password||d.suPassword||'', cp=d.confirmPassword||d.suConfirmPassword||''; if(!full)return send(res,false,'Full name is required.',null,400); if(!emailOk(email))return send(res,false,'A valid email address is required.',null,400); if(!Number.isFinite(age)||age<1||age>120)return send(res,false,'Please enter a valid age between 1 and 120.',null,400); if(!pw||pw.length<5)return send(res,false,'Password must be at least 5 characters.',null,400); if(pw!==cp)return send(res,false,'Passwords do not match.',null,400); if((await q('SELECT id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1',[email]))[0])return send(res,false,'An account with this email already exists.',null,409); let username=trim(d.username); if(!username){ let base=(email.split('@')[0]||'user').replace(/[^a-zA-Z0-9_]/g,'').toLowerCase()||'user'; username=base; if((await q('SELECT id FROM users WHERE LOWER(username)=LOWER(?) LIMIT 1',[username]))[0]) username=base+'_'+crypto.randomInt(100,10000); } else if((await q('SELECT id FROM users WHERE LOWER(username)=LOWER(?) LIMIT 1',[username]))[0]) return send(res,false,'This username is already taken.',null,409); const hash=await bcrypt.hash(pw,10); const r=await q("INSERT INTO users (username,full_name,email,age,password,role,created_at) VALUES (?,?,?,?,?,'patient',NOW())",[username,full,email,age,hash]); return send(res,true,'Account created successfully! Please log in.',{userId:r.insertId,email},201); }catch(e){return fail(res,e);} }

async function logout(req,res){ auth.clearCookie(res); return send(res,true,'Logged out successfully.'); }

async function session(req,res){ try{ if(req.method==='GET'){ const u=await auth.fresh(req); if(!u){auth.clearCookie(res);return send(res,true,'No active session.',{loggedIn:false,user:null});} const p=userPayload(u); auth.setCookie(res,auth.token(p)); return send(res,true,'Active session found.',{loggedIn:true,user:p}); } if(!['POST','PUT'].includes(req.method))return send(res,false,'Method not allowed.',null,405); const u=await auth.requireAuth(req,res); if(!u)return; const d=body(req), action=d.action||''; if(action==='change_password'){ const cur=d.currentPassword||d.cpCurrent||'', nw=d.newPassword||d.cpNew||'', cp=d.confirmPassword||d.cpConfirm||''; if(!cur||!nw)return send(res,false,'Current and new passwords are required.',null,400); if(nw.length<5)return send(res,false,'New password must be at least 5 characters.',null,400); if(nw!==cp)return send(res,false,'New passwords do not match.',null,400); const rows=await q('SELECT password FROM users WHERE id=? LIMIT 1',[u.id]); if(!rows[0]||!(await bcrypt.compare(cur,normHash(rows[0].password))))return send(res,false,'Current password is incorrect.',null,400); await q('UPDATE users SET password=? WHERE id=?',[await bcrypt.hash(nw,10),u.id]); return send(res,true,'Password updated successfully.'); } if(action==='update_photo'){ if(!Object.prototype.hasOwnProperty.call(d,'photo'))return send(res,false,'Photo data is required.',null,400); const photo=d.photo||null; await q('UPDATE users SET photo=? WHERE id=?',[photo,u.id]); return send(res,true,photo?'Profile photo updated successfully.':'Profile photo removed successfully.',{photo}); } return send(res,false,'Invalid action specified.',null,400); }catch(e){return fail(res,e);} }

async function doctors(req,res){ try{ const d=body(req); if(req.method==='GET'){ const {id='',search='',status='',spec=''}=req.query||{}; if(id){const rows=await q('SELECT id,name,specialization AS spec,phone,email,available_days AS days,available_time AS time,consultation_fee AS fee,status FROM doctors WHERE id=? LIMIT 1',[id]); return rows[0]?send(res,true,'Doctor found.',rows[0]):send(res,false,'Doctor not found.',null,404);} let sql='SELECT id,name,specialization AS spec,phone,email,available_days AS days,available_time AS time,consultation_fee AS fee,status,created_at FROM doctors WHERE 1=1', p=[]; if(status){sql+=' AND status=?';p.push(status)} if(spec){sql+=' AND specialization=?';p.push(spec)} if(search){sql+=' AND (LOWER(name) LIKE ? OR LOWER(specialization) LIKE ? OR LOWER(id) LIKE ? OR LOWER(email) LIKE ?)'; const x='%'+String(search).toLowerCase()+'%';p.push(x,x,x,x)} sql+=' ORDER BY id ASC'; return send(res,true,'Doctors retrieved successfully.',await q(sql,p)); }
    if(req.method==='POST'||req.method==='PUT'){ let name=trim(d.name), spec=trim(d.spec||d.specialization), phone=trim(d.phone), email=trim(d.email), days=trim(d.days||d.available_days||'Mon-Fri'), time=trim(d.time||d.available_time||'09:00 - 13:00'), fee=Number(d.fee??d.consultation_fee??500), status=trim(d.status||'Active'); if(!name)return send(res,false,'Doctor name is required.',null,400); if(!name.startsWith('Dr.'))name='Dr. '+name; if(!spec)return send(res,false,'Specialization is required.',null,400); if(!/^\d{10}$/.test(phone))return send(res,false,'Valid 10-digit phone number is required.',null,400); if(!emailOk(email))return send(res,false,'Valid email address is required.',null,400); if(req.method==='POST'){const id=trim(d.id)||await nextId('doctors','D'); await q('INSERT INTO doctors (id,name,specialization,phone,email,available_days,available_time,consultation_fee,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())',[id,name,spec,phone,email,days,time,fee,status]); return send(res,true,'Doctor added successfully.',{id,name},201);} const id=trim(d.id); if(!id)return send(res,false,'Doctor ID is required for update.',null,400); await q('UPDATE doctors SET name=?,specialization=?,phone=?,email=?,available_days=?,available_time=?,consultation_fee=?,status=? WHERE id=?',[name,spec,phone,email,days,time,fee,status,id]); return send(res,true,'Doctor updated successfully.',{id,name}); }
    if(req.method==='DELETE'){const id=trim(d.id||(req.query||{}).id); if(!id)return send(res,false,'Doctor ID is required for deletion.',null,400); await q('DELETE FROM doctors WHERE id=?',[id]); return send(res,true,'Doctor deleted successfully.');} return send(res,false,'Method not allowed.',null,405);
  }catch(e){return fail(res,e);} }

async function patients(req,res){ try{ const d=body(req); if(req.method==='GET'){const {id='',search='',status=''}=req.query||{}; if(id){const rows=await q('SELECT * FROM patients WHERE id=? LIMIT 1',[id]);return rows[0]?send(res,true,'Patient found.',rows[0]):send(res,false,'Patient not found.',null,404)} let sql='SELECT id,full_name AS name,age,gender,dob,phone,email,address,blood,doctor_id,doctor_name AS doctor,notes,status,created_at FROM patients WHERE 1=1',p=[]; if(status){sql+=' AND status=?';p.push(status)} if(search){sql+=' AND (LOWER(full_name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(id) LIKE ? OR LOWER(doctor_name) LIKE ? OR LOWER(address) LIKE ?)';const x='%'+String(search).toLowerCase()+'%';p.push(x,x,x,x,x)} sql+=' ORDER BY created_at DESC,id DESC';return send(res,true,'Patients retrieved successfully.',await q(sql,p));}
    if(req.method==='POST'||req.method==='PUT'){const name=trim(d.name||d.full_name), age=d.age==null?null:Number(d.age), gender=trim(d.gender||'Male'), dob=d.dob||null, phone=trim(d.phone), email=trim(d.email), address=trim(d.address), blood=trim(d.blood), doctor=trim(d.doctor||d.doctor_name), notes=trim(d.notes), status=trim(d.status||'Outpatient'); if(!name)return send(res,false,'Patient name is required.',null,400); if(age==null||age<0)return send(res,false,'Valid age is required.',null,400); if(!/^\d{10}$/.test(phone))return send(res,false,'Valid 10-digit phone number is required.',null,400); let doctorId=null;if(doctor){const rr=await q('SELECT id FROM doctors WHERE name=? LIMIT 1',[doctor]);doctorId=rr[0]?.id||null} if(req.method==='POST'){const id=trim(d.id)||await nextId('patients','P'); await q('INSERT INTO patients (id,full_name,age,gender,dob,phone,email,address,blood,doctor_id,doctor_name,notes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())',[id,name,age,gender,dob,phone,email,address,blood,doctorId,doctor,notes,status]);return send(res,true,'Patient added successfully.',{id,name},201)} const id=trim(d.id); if(!id)return send(res,false,'Patient ID is required for update.',null,400); await q('UPDATE patients SET full_name=?,age=?,gender=?,dob=?,phone=?,email=?,address=?,blood=?,doctor_id=?,doctor_name=?,notes=?,status=? WHERE id=?',[name,age,gender,dob,phone,email,address,blood,doctorId,doctor,notes,status,id]);return send(res,true,'Patient updated successfully.',{id,name}); }
    if(req.method==='DELETE'){const id=trim(d.id||(req.query||{}).id);if(!id)return send(res,false,'Patient ID is required for deletion.',null,400);await q('DELETE FROM patients WHERE id=?',[id]);return send(res,true,'Patient deleted successfully.')} return send(res,false,'Method not allowed.',null,405);
  }catch(e){return fail(res,e);} }

let apptSchemaReady=false;
<<<<<<< HEAD

// Errors that just mean "this migration already ran" — safe to ignore. Anything
// else (missing ALTER privilege, for instance) is a real problem and gets logged
// loudly instead of being swallowed, because the queries below depend on these
// columns existing.
const BENIGN_MIGRATION_CODES=['ER_DUP_FIELDNAME','ER_DUP_KEYNAME','ER_TABLE_EXISTS_ERROR','ER_CANT_DROP_FIELD_OR_KEY'];

async function migrate(label,sql){
  try{ await q(sql); return true; }
  catch(e){
    if(BENIGN_MIGRATION_CODES.includes(e&&e.code)) return true;
    console.error('[schema] Migration failed ('+label+'): '+(e&&e.code||'')+' '+(e&&e.sqlMessage||e&&e.message||e));
    return false;
  }
}

async function ensureApptSchema(){
  if(apptSchemaReady) return;

  await migrate('create notifications table',"CREATE TABLE IF NOT EXISTS notifications (`id` INT AUTO_INCREMENT PRIMARY KEY, `type` ENUM('reschedule','cancel') NOT NULL, `appointment_id` VARCHAR(20) NULL, `patient_name` VARCHAR(100) NULL, `message` TEXT NOT NULL, `old_date` DATE NULL, `old_time` VARCHAR(50) NULL, `new_date` DATE NULL, `new_time` VARCHAR(50) NULL, `is_read` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, INDEX idx_notif_read (is_read))");

  await migrate('appointments.user_id','ALTER TABLE appointments ADD COLUMN user_id INT NULL AFTER doctor_id');
  await migrate('index idx_appt_user','ALTER TABLE appointments ADD INDEX idx_appt_user (user_id)');

  // Timestamp the moment an admin marks an appointment Completed. The 12-hour
  // archive window is measured from here — the row itself is never deleted.
  await migrate('appointments.completed_at','ALTER TABLE appointments ADD COLUMN completed_at DATETIME NULL AFTER status');
  // Set when an admin clears a cancelled appointment from the patient's view.
  await migrate('appointments.cleared_at','ALTER TABLE appointments ADD COLUMN cleared_at DATETIME NULL AFTER completed_at');
  await migrate('index idx_appt_completed','ALTER TABLE appointments ADD INDEX idx_appt_completed (completed_at)');

  // Migrate the legacy 3-value status set to Pending/Confirmed/Completed/Cancelled.
  // Done in three steps so existing 'Scheduled' rows are remapped before that value
  // is dropped from the ENUM (otherwise MySQL would blank them out). If the widening
  // step fails the remap is skipped, so no data is put at risk.
  if(await migrate('status enum (widen)',"ALTER TABLE appointments MODIFY COLUMN `status` ENUM('Pending','Confirmed','Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Pending'")){
    if(await migrate('status remap Scheduled -> Pending',"UPDATE appointments SET status='Pending' WHERE status='Scheduled'")){
      await migrate('status enum (narrow)',"ALTER TABLE appointments MODIFY COLUMN `status` ENUM('Pending','Confirmed','Completed','Cancelled') NOT NULL DEFAULT 'Pending'");
    }
  }

  // Backfill a completion timestamp for rows completed before this column existed,
  // so they fall under the archive rule instead of lingering forever.
  await migrate('backfill completed_at',"UPDATE appointments SET completed_at=created_at WHERE status='Completed' AND completed_at IS NULL");

  // Verify the columns the appointment queries actually depend on. If they are
  // missing, leave apptSchemaReady false so the next request retries rather than
  // failing every query from here on with an opaque error.
  try{
    const cols=await q("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='appointments' AND COLUMN_NAME IN ('user_id','completed_at','cleared_at')");
    const found=cols.map(r=>r.COLUMN_NAME);
    const missing=['user_id','completed_at','cleared_at'].filter(c=>!found.includes(c));
    if(missing.length){
      console.error('[schema] appointments is missing required column(s): '+missing.join(', ')+'. The database user likely lacks ALTER privilege — apply database.sql manually.');
      return;
    }
  }catch(e){
    console.error('[schema] Could not verify appointments columns: '+(e&&e.message||e));
    return;
  }

  apptSchemaReady=true;
}

// The exact condition that decides whether a row is still visible in the patient's
// "My Appointments" list. Completed rows survive 12 hours past completion; cancelled
// rows survive until an admin clears them. Nothing is ever deleted — admin queries
// simply omit this clause, so the full history stays intact for records/analytics.
const USER_VISIBLE_SQL =
  "(cleared_at IS NULL AND (status <> 'Completed' OR (completed_at IS NOT NULL AND completed_at > DATE_SUB(NOW(), INTERVAL 12 HOUR))))";

const USER_MANAGEABLE = ['Pending','Confirmed'];

// Records a reschedule/cancel event so the admin Notification Center can show it,
// capturing old vs new date/time for reschedules.
async function addApptNotification(type,apptId,existing,updates,actor){
  const patientName=existing.full_name;
  const oldDate=existing.appointment_date, oldTime=existing.time_slot;
  // Who actually performed the change. Staff and admins can act on a patient's
  // behalf, so the message says so rather than reading as if the patient did it.
  const isOwner=actor&&existing.user_id!=null&&Number(existing.user_id)===Number(actor.id);
  const who=isOwner||!actor?patientName:(actor.full_name||actor.username||'Staff')+' ('+actor.role+') ';
  const subject=isOwner||!actor?patientName:who+'— on behalf of '+patientName+' —';
  let message,newDate=null,newTime=null;
  if(type==='reschedule'){
    newDate=updates.date; newTime=updates.time;
    message=subject+' rescheduled appointment '+apptId+' — was '+String(oldDate).slice(0,10)+' at '+oldTime+', now '+newDate+' at '+newTime+'.';
  } else {
    message=subject+' cancelled appointment '+apptId+' (was scheduled '+String(oldDate).slice(0,10)+' at '+oldTime+').';
=======
async function ensureApptSchema(){
  if(apptSchemaReady) return;
  try{ await q("CREATE TABLE IF NOT EXISTS notifications (`id` INT AUTO_INCREMENT PRIMARY KEY, `type` ENUM('reschedule','cancel') NOT NULL, `appointment_id` VARCHAR(20) NULL, `patient_name` VARCHAR(100) NULL, `message` TEXT NOT NULL, `old_date` DATE NULL, `old_time` VARCHAR(50) NULL, `new_date` DATE NULL, `new_time` VARCHAR(50) NULL, `is_read` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, INDEX idx_notif_read (is_read))"); }catch(e){}
  try{ await q('ALTER TABLE appointments ADD COLUMN user_id INT NULL AFTER doctor_id'); }catch(e){}
  try{ await q('ALTER TABLE appointments ADD INDEX idx_appt_user (user_id)'); }catch(e){}
  apptSchemaReady=true;
}

// Records a reschedule/cancel event so the admin Notification Center can show it,
// capturing old vs new date/time for reschedules.
async function addApptNotification(type,apptId,existing,updates){
  const patientName=existing.full_name;
  const oldDate=existing.appointment_date, oldTime=existing.time_slot;
  let message,newDate=null,newTime=null;
  if(type==='reschedule'){
    newDate=updates.date; newTime=updates.time;
    message=patientName+' rescheduled appointment '+apptId+' — was '+String(oldDate).slice(0,10)+' at '+oldTime+', now '+newDate+' at '+newTime+'.';
  } else {
    message=patientName+' cancelled appointment '+apptId+' (was scheduled '+String(oldDate).slice(0,10)+' at '+oldTime+').';
>>>>>>> c33837d (update hms)
  }
  await q('INSERT INTO notifications (type,appointment_id,patient_name,message,old_date,old_time,new_date,new_time,created_at) VALUES (?,?,?,?,?,?,?,?,NOW())',[type,apptId,patientName,message,oldDate,oldTime,newDate,newTime]);
}

async function appointments(req,res){ try{
  await ensureApptSchema();
  const d=body(req);
  const sessionUser=await auth.fresh(req);

  if(req.method==='GET'){
    const x=req.query||{}, id=trim(x.id), search=trim(x.search), status=trim(x.status), date=trim(x.date), today=String(x.today||'')==='1', mine=String(x.mine||'')==='1';
    if(id){const r=await q('SELECT * FROM appointments WHERE id=? LIMIT 1',[id]);return r[0]?send(res,true,'Appointment found.',r[0]):send(res,false,'Appointment not found.',null,404)}
    if(mine){
      if(!sessionUser)return send(res,false,'Please log in to view your appointments.',null,401);
<<<<<<< HEAD
      const rows=await q('SELECT id,patient_id,doctor_id,full_name AS patient,age,gender,email,problem,doctor_name AS doctor,department AS dept,fee,appointment_date AS date,time_slot AS time,payment_mode AS paymentMode,notes,status,completed_at,CASE WHEN status=\'Completed\' AND completed_at IS NOT NULL THEN GREATEST(0,TIMESTAMPDIFF(SECOND,NOW(),DATE_ADD(completed_at,INTERVAL 12 HOUR))) ELSE NULL END AS archiveSecondsLeft,created_at FROM appointments WHERE user_id=? AND '+USER_VISIBLE_SQL+' ORDER BY created_at DESC,id DESC',[sessionUser.id]);
      return send(res,true,'Your appointments retrieved.',rows);
    }
    let sql='SELECT id,patient_id,doctor_id,full_name AS patient,age,gender,email,problem,doctor_name AS doctor,department AS dept,fee,appointment_date AS date,time_slot AS time,payment_mode AS paymentMode,notes,status,completed_at,cleared_at,created_at FROM appointments WHERE 1=1',p=[];
=======
      const rows=await q('SELECT id,patient_id,doctor_id,full_name AS patient,age,gender,email,problem,doctor_name AS doctor,department AS dept,fee,appointment_date AS date,time_slot AS time,payment_mode AS paymentMode,notes,status,created_at FROM appointments WHERE user_id=? ORDER BY created_at DESC,id DESC',[sessionUser.id]);
      return send(res,true,'Your appointments retrieved.',rows);
    }
    let sql='SELECT id,patient_id,doctor_id,full_name AS patient,age,gender,email,problem,doctor_name AS doctor,department AS dept,fee,appointment_date AS date,time_slot AS time,payment_mode AS paymentMode,notes,status,created_at FROM appointments WHERE 1=1',p=[];
>>>>>>> c33837d (update hms)
    if(today)sql+=' AND appointment_date=CURDATE()';else if(date){sql+=' AND appointment_date=?';p.push(date)}
    if(status){sql+=' AND status=?';p.push(status)}
    if(search){sql+=' AND (LOWER(full_name) LIKE ? OR LOWER(doctor_name) LIKE ? OR LOWER(problem) LIKE ? OR LOWER(id) LIKE ? OR LOWER(email) LIKE ?)';const z='%'+search.toLowerCase()+'%';p.push(z,z,z,z,z)}
    sql+=' ORDER BY appointment_date DESC,time_slot ASC,id DESC';
    return send(res,true,'Appointments retrieved successfully.',await q(sql,p));
  }

  if(req.method==='POST'){
    const name=trim(d.patient||d.full_name||d.name),age=d.age==null?null:Number(d.age),gender=trim(d.gender||'Male'),email=trim(d.email),problem=trim(d.problem),doctor=trim(d.doctor||d.doctor_name),slot=trim(d.time||d.time_slot),date=trim(d.date||d.appointment_date||new Date().toISOString().slice(0,10)),pay=trim(d.paymentMode||d.payment_mode||'Cash Only'),notes=trim(d.notes||problem);
    if(!name)return send(res,false,'Patient name is required.',null,400);
    if(!age||age<=0)return send(res,false,'Valid age is required.',null,400);
    if(!emailOk(email))return send(res,false,'Valid email address is required.',null,400);
    if(!problem)return send(res,false,'Problem / symptom is required.',null,400);
    if(!doctor)return send(res,false,'Doctor is required.',null,400);
    if(!slot)return send(res,false,'Time slot is required.',null,400);

    // Rate limit: max 5 bookings per rolling 24h window, keyed by the logged-in
    // user's account when available, otherwise by the booking email (guest booking).
    const rlWhere=sessionUser?'user_id=?':'(user_id IS NULL AND LOWER(email)=LOWER(?))';
    const rlVal=sessionUser?sessionUser.id:email;
    const rl=await q('SELECT COUNT(*) c FROM appointments WHERE created_at>=DATE_SUB(NOW(),INTERVAL 24 HOUR) AND '+rlWhere,[rlVal]);
    if(Number(rl[0].c)>=5)return send(res,false,'You have reached the maximum of 5 appointment bookings within a 24-hour period. Please try again later.',null,429);

    const dr=(await q('SELECT id,specialization,consultation_fee FROM doctors WHERE name=? LIMIT 1',[doctor]))[0]||{};
    const doctorId=dr.id||null,dept=dr.specialization||'General',fee=Number(d.fee??dr.consultation_fee??600);
    let pr=(await q('SELECT id FROM patients WHERE LOWER(email)=LOWER(?) OR LOWER(full_name)=LOWER(?) LIMIT 1',[email,name]))[0],patientId;
    if(pr)patientId=pr.id;else{patientId=await nextId('patients','P');await q("INSERT INTO patients (id,full_name,age,gender,phone,email,doctor_id,doctor_name,notes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,'Outpatient',NOW())",[patientId,name,age,gender,trim(d.phone)||'N/A',email,doctorId,doctor,problem])}
    const id=trim(d.id)||await nextId('appointments','A');
<<<<<<< HEAD
    await q("INSERT INTO appointments (id,patient_id,doctor_id,user_id,full_name,age,gender,email,problem,doctor_name,department,fee,appointment_date,time_slot,payment_mode,notes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Pending',NOW())",[id,patientId,doctorId,sessionUser?sessionUser.id:null,name,age,gender,email,problem,doctor,dept,fee,date,slot,pay,notes]);
    return send(res,true,'Appointment booked successfully.',{id,patient_id:patientId,doctor_id:doctorId,patient:name,age,gender,email,problem,doctor,dept,fee,date,time:slot,paymentMode:pay,notes,status:'Pending'},201);
=======
    await q("INSERT INTO appointments (id,patient_id,doctor_id,user_id,full_name,age,gender,email,problem,doctor_name,department,fee,appointment_date,time_slot,payment_mode,notes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Scheduled',NOW())",[id,patientId,doctorId,sessionUser?sessionUser.id:null,name,age,gender,email,problem,doctor,dept,fee,date,slot,pay,notes]);
    return send(res,true,'Appointment booked successfully.',{id,patient_id:patientId,doctor_id:doctorId,patient:name,age,gender,email,problem,doctor,dept,fee,date,time:slot,paymentMode:pay,notes,status:'Scheduled'},201);
>>>>>>> c33837d (update hms)
  }

  if(req.method==='PUT'){
    const id=trim(d.id);
    if(!id)return send(res,false,'Appointment ID is required.',null,400);
    const action=trim(d.action||'').toLowerCase();

    if(action==='reschedule'||action==='cancel'){
      const existing=(await q('SELECT * FROM appointments WHERE id=? LIMIT 1',[id]))[0];
      if(!existing)return send(res,false,'Appointment not found.',null,404);
      if(!sessionUser)return send(res,false,'Please log in to manage this appointment.',null,401);
      const isOwner=existing.user_id!=null&&Number(existing.user_id)===Number(sessionUser.id);
      const isStaffAdmin=['admin','staff'].includes(sessionUser.role);
      if(!isOwner&&!isStaffAdmin)return send(res,false,'You can only manage your own appointments.',null,403);
<<<<<<< HEAD
      if(!USER_MANAGEABLE.includes(existing.status))return send(res,false,'This appointment is already '+String(existing.status).toLowerCase()+' and can no longer be '+(action==='cancel'?'cancelled':'rescheduled')+'.',null,400);

      if(action==='reschedule'){
        // Only the preferred date is required; if the patient doesn't pick a new
        // slot the existing one is carried over unchanged.
        const newDate=trim(d.date||d.appointment_date);
        const newSlot=trim(d.time||d.time_slot)||existing.time_slot;
        if(!newDate)return send(res,false,'A new preferred date is required.',null,400);
        if(newDate===String(existing.appointment_date).slice(0,10)&&newSlot===existing.time_slot)return send(res,false,'That is already the scheduled date and time.',null,400);
        await q('UPDATE appointments SET appointment_date=?,time_slot=? WHERE id=?',[newDate,newSlot,id]);
        await addApptNotification('reschedule',id,existing,{date:newDate,time:newSlot},sessionUser);
        return send(res,true,'Appointment rescheduled successfully.',{id,date:newDate,time:newSlot,status:existing.status});
      }

      await q("UPDATE appointments SET status='Cancelled' WHERE id=?",[id]);
      await addApptNotification('cancel',id,existing,null,sessionUser);
=======
      if(existing.status!=='Scheduled')return send(res,false,'Only scheduled appointments can be '+(action==='cancel'?'cancelled':'rescheduled')+'.',null,400);

      if(action==='reschedule'){
        const newDate=trim(d.date||d.appointment_date),newSlot=trim(d.time||d.time_slot);
        if(!newDate)return send(res,false,'A new date is required.',null,400);
        if(!newSlot)return send(res,false,'A new time slot is required.',null,400);
        await q('UPDATE appointments SET appointment_date=?,time_slot=? WHERE id=?',[newDate,newSlot,id]);
        await addApptNotification('reschedule',id,existing,{date:newDate,time:newSlot});
        return send(res,true,'Appointment rescheduled successfully.',{id,date:newDate,time:newSlot,status:'Scheduled'});
      }

      await q("UPDATE appointments SET status='Cancelled' WHERE id=?",[id]);
      await addApptNotification('cancel',id,existing,null);
>>>>>>> c33837d (update hms)
      return send(res,true,'Appointment cancelled successfully.',{id,status:'Cancelled'});
    }

    const u=await auth.requireAuth(req,res,['admin','staff']); if(!u)return;
<<<<<<< HEAD

    // Admin-only: hide a cancelled appointment from the patient's view. The row and
    // all its data stay in the database and on the admin list.
    if(action==='clear'){
      const existing=(await q('SELECT status FROM appointments WHERE id=? LIMIT 1',[id]))[0];
      if(!existing)return send(res,false,'Appointment not found.',null,404);
      if(existing.status!=='Cancelled')return send(res,false,'Only cancelled appointments can be cleared from the patient view.',null,400);
      await q('UPDATE appointments SET cleared_at=NOW() WHERE id=?',[id]);
      return send(res,true,'Appointment cleared from the patient view. The record is retained.',{id,cleared:true});
    }

    const status=trim(d.status);
    if(status&&!['Pending','Confirmed','Completed','Cancelled'].includes(status))return send(res,false,'Invalid status. Use Pending, Confirmed, Completed or Cancelled.',null,400);

    const f=[],p=[];
    if(status){
      f.push('status=?');p.push(status);
      // Completing starts the 12-hour visibility window; moving back out of
      // Completed clears the stamp so the window doesn't apply.
      if(status==='Completed'){f.push('completed_at=NOW()')}
      else{f.push('completed_at=NULL')}
    }
=======
    const f=[],p=[];
    if(trim(d.status)){f.push('status=?');p.push(trim(d.status))}
>>>>>>> c33837d (update hms)
    if(d.notes!=null){f.push('notes=?');p.push(trim(d.notes))}
    if(!f.length)return send(res,false,'No fields specified for update.',null,400);
    p.push(id);
    await q('UPDATE appointments SET '+f.join(',')+' WHERE id=?',p);
<<<<<<< HEAD
    return send(res,true,'Appointment updated successfully.',{id,status});
=======
    return send(res,true,'Appointment updated successfully.',{id,status:trim(d.status)});
>>>>>>> c33837d (update hms)
  }

  if(req.method==='DELETE'){
    const u=await auth.requireAuth(req,res,['admin','staff']); if(!u)return;
    const id=trim(d.id||(req.query||{}).id);
    if(!id)return send(res,false,'Appointment ID is required.',null,400);
    await q('DELETE FROM appointments WHERE id=?',[id]);
    return send(res,true,'Appointment cancelled/deleted successfully.');
  }

  return send(res,false,'Method not allowed.',null,405);
  }catch(e){return fail(res,e);} }

async function notifications(req,res){ try{
  await ensureApptSchema();
  const u=await auth.requireAuth(req,res,['admin','staff']); if(!u)return;
  if(req.method==='GET'){
    const rows=await q('SELECT id,type,appointment_id,patient_name,message,old_date,old_time,new_date,new_time,is_read,created_at FROM notifications ORDER BY created_at DESC LIMIT 50');
    const unread=(await q('SELECT COUNT(*) c FROM notifications WHERE is_read=0'))[0].c;
    return send(res,true,'Notifications retrieved.',{items:rows,unread:Number(unread)});
  }
  if(req.method==='PUT'){
    const d=body(req);
    if(d.markAllRead){ await q('UPDATE notifications SET is_read=1 WHERE is_read=0'); return send(res,true,'All notifications marked as read.'); }
    const id=trim(d.id); if(!id)return send(res,false,'Notification ID is required.',null,400);
    await q('UPDATE notifications SET is_read=1 WHERE id=?',[id]);
    return send(res,true,'Notification marked as read.');
  }
  return send(res,false,'Method not allowed.',null,405);
  }catch(e){return fail(res,e);} }

async function invoices(req,res){ try{const d=body(req);if(req.method==='GET'){const {id='',search='',status=''}=req.query||{};if(id){const r=await q('SELECT id,patient_id,appointment_id,invoice_number,invoice_date AS date,patient_name AS patient,consultation_fee AS fee,other_charges AS other,total_amount AS total,status FROM invoices WHERE id=? LIMIT 1',[id]);return r[0]?send(res,true,'Invoice found.',r[0]):send(res,false,'Invoice not found.',null,404)}let sql='SELECT id,patient_id,appointment_id,invoice_number,invoice_date AS date,patient_name AS patient,consultation_fee AS fee,other_charges AS other,total_amount AS total,status,created_at FROM invoices WHERE 1=1',p=[];if(status){sql+=' AND status=?';p.push(status)}if(search){sql+=' AND (LOWER(id) LIKE ? OR LOWER(patient_name) LIKE ? OR LOWER(invoice_number) LIKE ?)';const x='%'+String(search).toLowerCase()+'%';p.push(x,x,x)}sql+=' ORDER BY invoice_date DESC,id DESC';return send(res,true,'Invoices retrieved successfully.',await q(sql,p))}
    if(req.method==='POST'){const patient=trim(d.patient||d.patient_name),date=trim(d.date||d.invoice_date||new Date().toISOString().slice(0,10)),fee=Number(d.fee??d.consultation_fee??0),other=Number(d.other??d.other_charges??0),status=trim(d.status||'Pending');if(!patient)return send(res,false,'Patient name is required.',null,400);if(fee<0||other<0)return send(res,false,'Charges cannot be negative.',null,400);const id=trim(d.id)||await nextId('invoices','INV'),pr=(await q('SELECT id FROM patients WHERE LOWER(full_name)=LOWER(?) LIMIT 1',[patient]))[0];await q('INSERT INTO invoices (id,patient_id,invoice_number,invoice_date,patient_name,consultation_fee,other_charges,total_amount,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())',[id,pr?.id||null,id,date,patient,fee,other,fee+other,status]);return send(res,true,'Invoice created successfully.',{id,patient,total:fee+other,status},201)}
    if(req.method==='PUT'){const id=trim(d.id);if(!id)return send(res,false,'Invoice ID is required.',null,400);if(d.toggle_status!=null||(Object.keys(d).length===2&&d.status!=null)){let status=trim(d.status);if(!status){const r=(await q('SELECT status FROM invoices WHERE id=? LIMIT 1',[id]))[0];status=r&&r.status==='Paid'?'Pending':'Paid'}await q('UPDATE invoices SET status=? WHERE id=?',[status,id]);return send(res,true,`Invoice marked as ${status}.`,{id,status})}const patient=trim(d.patient||d.patient_name),date=trim(d.date||d.invoice_date||new Date().toISOString().slice(0,10)),fee=Number(d.fee??0),other=Number(d.other??0),status=trim(d.status||'Pending');await q('UPDATE invoices SET patient_name=?,invoice_date=?,consultation_fee=?,other_charges=?,total_amount=?,status=? WHERE id=?',[patient,date,fee,other,fee+other,status,id]);return send(res,true,'Invoice updated successfully.',{id,patient,total:fee+other,status})}
    if(req.method==='DELETE'){const id=trim(d.id||(req.query||{}).id);if(!id)return send(res,false,'Invoice ID is required.',null,400);await q('DELETE FROM invoices WHERE id=?',[id]);return send(res,true,'Invoice deleted successfully.')}return send(res,false,'Method not allowed.',null,405);
  }catch(e){return fail(res,e);} }

async function staff(req,res){ try{const d=body(req);if(req.method==='GET'){const {id='',search='',status=''}=req.query||{};if(id){const r=await q('SELECT * FROM staff WHERE id=? LIMIT 1',[id]);return r[0]?send(res,true,'Staff member found.',r[0]):send(res,false,'Staff member not found.',null,404)}let sql='SELECT id,name,role,phone,email,username,status,created_at FROM staff WHERE 1=1',p=[];if(status){sql+=' AND status=?';p.push(status)}if(search){sql+=' AND (LOWER(name) LIKE ? OR LOWER(role) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(email) LIKE ? OR LOWER(id) LIKE ?)';const x='%'+String(search).toLowerCase()+'%';p.push(x,x,x,x,x)}sql+=' ORDER BY id ASC';return send(res,true,'Staff retrieved successfully.',await q(sql,p))} const u=await auth.requireAuth(req,res,['admin']);if(!u)return; if(req.method==='POST'||req.method==='PUT'){const name=trim(d.name),role=trim(d.role||'Nurse'),phone=trim(d.phone),email=trim(d.email),username=trim(d.username||d.user),status=trim(d.status||'Active');if(!name)return send(res,false,'Staff name is required.',null,400);if(!/^\d{10}$/.test(phone))return send(res,false,'Valid 10-digit phone number is required.',null,400);if(!emailOk(email))return send(res,false,'Valid email address is required.',null,400);if(req.method==='POST'){const id=trim(d.id)||await nextId('staff','S');await q('INSERT INTO staff (id,name,role,phone,email,username,status,created_at) VALUES (?,?,?,?,?,?,?,NOW())',[id,name,role,phone,email,username||null,status]);return send(res,true,'Staff added successfully.',{id,name},201)}const id=trim(d.id);if(!id)return send(res,false,'Staff ID is required for update.',null,400);await q('UPDATE staff SET name=?,role=?,phone=?,email=?,username=?,status=? WHERE id=?',[name,role,phone,email,username||null,status,id]);return send(res,true,'Staff updated successfully.',{id,name})}if(req.method==='DELETE'){const id=trim(d.id||(req.query||{}).id);if(!id)return send(res,false,'Staff ID is required for deletion.',null,400);await q('DELETE FROM staff WHERE id=?',[id]);return send(res,true,'Staff deleted successfully.')}return send(res,false,'Method not allowed.',null,405);
  }catch(e){return fail(res,e);} }

async function contacts(req,res){try{const d=body(req);if(req.method==='POST'){const name=trim(d.name),email=trim(d.email),subject=trim(d.subject),message=trim(d.message);if(!name)return send(res,false,'Your name is required.',null,400);if(!emailOk(email))return send(res,false,'A valid email address is required.',null,400);if(!subject)return send(res,false,'Subject is required.',null,400);if(!message)return send(res,false,'Message is required.',null,400);await q('INSERT INTO contacts (name,email,subject,message,created_at) VALUES (?,?,?,?,NOW())',[name,email,subject,message]);return send(res,true,'Thank you! Your message has been sent to MediCare Hospital. We will contact you shortly.')}if(req.method==='GET'){const u=await auth.requireAuth(req,res,['admin']);if(!u)return;return send(res,true,'Contact messages retrieved.',await q('SELECT id,name,email,subject,message,created_at FROM contacts ORDER BY created_at DESC'))}return send(res,false,'Method not allowed.',null,405)}catch(e){return fail(res,e)}}

async function dashboard(req,res){try{const u=await auth.requireAuth(req,res,['admin','staff']);if(!u)return;const [p,d,a,r,rev,pend,leave,recent,today]=await Promise.all([q('SELECT COUNT(*) total FROM patients'),q('SELECT COUNT(*) total FROM doctors'),q('SELECT COUNT(*) total FROM appointments WHERE appointment_date=CURDATE()'),q('SELECT COALESCE(SUM(total_amount),0) total FROM invoices'),q("SELECT COALESCE(SUM(CASE WHEN invoice_date>=DATE_SUB(CURDATE(),INTERVAL 7 DAY) THEN total_amount ELSE 0 END),0) rev_7d,COALESCE(SUM(CASE WHEN invoice_date>=DATE_SUB(CURDATE(),INTERVAL 1 MONTH) THEN total_amount ELSE 0 END),0) rev_1m,COALESCE(SUM(CASE WHEN invoice_date>=DATE_SUB(CURDATE(),INTERVAL 6 MONTH) THEN total_amount ELSE 0 END),0) rev_6m,COALESCE(SUM(CASE WHEN invoice_date>=DATE_SUB(CURDATE(),INTERVAL 1 YEAR) THEN total_amount ELSE 0 END),0) rev_1y FROM invoices WHERE status='Paid'"),q("SELECT COUNT(*) total FROM invoices WHERE status='Pending'"),q("SELECT COUNT(*) total FROM doctors WHERE status='On Leave'"),q('SELECT id,full_name AS name,doctor_name AS doctor,status FROM patients ORDER BY created_at DESC,id DESC LIMIT 5'),q('SELECT id,full_name AS patient,time_slot AS time,status FROM appointments WHERE appointment_date=CURDATE() ORDER BY time_slot ASC LIMIT 10')]);const labels=[],wa=[],wr=[];for(let i=6;i>=0;i--){const dt=new Date();dt.setDate(dt.getDate()-i);const ds=dt.toISOString().slice(0,10);labels.push(dt.toLocaleDateString('en-US',{weekday:'short'}));wa.push(Number((await q('SELECT COUNT(*) total FROM appointments WHERE appointment_date=?',[ds]))[0].total));wr.push(Number((await q('SELECT COALESCE(SUM(total_amount),0) total FROM invoices WHERE invoice_date=?',[ds]))[0].total))}const rv=rev[0];return send(res,true,'Dashboard metrics loaded.',{totalPatients:Number(p[0].total),totalDoctors:Number(d[0].total),todayAppointments:Number(a[0].total),totalRevenue:Number(r[0].total),revenueBreakdown:{days7:Number(rv.rev_7d),month1:Number(rv.rev_1m),months6:Number(rv.rev_6m),year1:Number(rv.rev_1y)},pendingInvoices:Number(pend[0].total),doctorsOnLeave:Number(leave[0].total),recentPatients:recent,todayAppointmentsList:today,chartLabels:labels,chartAppointments:wa,chartRevenue:wr})}catch(e){return fail(res,e)}}

async function forgotPassword(req,res){try{if(req.method!=='POST')return send(res,false,'Method not allowed. Use POST.',null,405);const d=body(req),action=trim(d.action);if(!action)return send(res,false,'Action parameter is required.',null,400);await q('CREATE TABLE IF NOT EXISTS password_resets (id INT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(100) NOT NULL,token VARCHAR(64) NOT NULL UNIQUE,expires_at DATETIME NOT NULL,created_at DATETIME DEFAULT CURRENT_TIMESTAMP,INDEX idx_reset_token(token),INDEX idx_reset_email(email))');if(action==='request_reset_link'){const email=trim(d.email);if(!emailOk(email))return send(res,false,'Please enter a valid email address.',null,400);const u=(await q('SELECT id,full_name,email FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1',[email]))[0];if(!u)return send(res,false,'No account found with that email address.',null,404);const token=crypto.randomBytes(32).toString('hex'),expires=new Date(Date.now()+3600000);await q('DELETE FROM password_resets WHERE LOWER(email)=LOWER(?)',[email]);await q('INSERT INTO password_resets (email,token,expires_at) VALUES (?,?,?)',[u.email,token,expires]);return send(res,true,'Reset link generated successfully.',{token,email:u.email,fullName:u.full_name,expiresAt:expires.toISOString()})}if(action==='verify_token'||action==='reset_with_token'){const token=trim(d.token);if(!token)return send(res,false,'Reset token is required.',null,400);const rr=(await q('SELECT email,expires_at FROM password_resets WHERE token=? LIMIT 1',[token]))[0];if(!rr)return send(res,false,'This password reset link is invalid or has already been used.',null,400);if(new Date(rr.expires_at).getTime()<Date.now()){await q('DELETE FROM password_resets WHERE token=?',[token]);return send(res,false,'This password reset link has expired. Please request a new one.',null,400)}if(action==='verify_token')return send(res,true,'Token is valid.',{email:rr.email});const nw=d.newPassword||'';if(nw.length<5)return send(res,false,'Password must be at least 5 characters.',null,400);const u=(await q('SELECT id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1',[rr.email]))[0];if(!u)return send(res,false,'Account not found.',null,404);await q('UPDATE users SET password=? WHERE id=?',[await bcrypt.hash(nw,10),u.id]);await q('DELETE FROM password_resets WHERE token=?',[token]);return send(res,true,'Password has been reset successfully. Please log in with your new password.',{email:rr.email})}if(action==='request_otp'){const email=trim(d.email);if(!emailOk(email))return send(res,false,'Please enter a valid email address.',null,400);const u=(await q('SELECT id,full_name,email FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1',[email]))[0];if(!u)return send(res,false,'No account found with that email address.',null,404);return send(res,true,'Account verified. An OTP verification code can now be sent.',{email:u.email,fullName:u.full_name})}if(action==='reset_password'){const email=trim(d.email),nw=d.newPassword||'';if(!email)return send(res,false,'Email address is required.',null,400);if(nw.length<5)return send(res,false,'Password must be at least 5 characters.',null,400);const u=(await q('SELECT id,email FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1',[email]))[0];if(!u)return send(res,false,'Account not found for the provided email.',null,404);await q('UPDATE users SET password=? WHERE id=?',[await bcrypt.hash(nw,10),u.id]);return send(res,true,'Password has been reset successfully. Please log in with your new password.',{email:u.email})}return send(res,false,'Invalid action specified.',null,400)}catch(e){return fail(res,e)}}

module.exports={login,signup,logout,session,doctors,patients,appointments,invoices,staff,contacts,dashboard,forgotPassword,notifications};