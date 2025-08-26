// === Config Supabase ===
const SB_URL  = "";
const SB_ANON = "";
const ALLOWED_EMAILS = [""];   // config yours in supabase setting

const sb = supabase.createClient(SB_URL, SB_ANON);

// ===== DOM =====
const $auth = document.getElementById("auth");
const $app  = document.getElementById("app");
const $email = document.getElementById("email");
const $password = document.getElementById("password");
const $loginBtn = document.getElementById("loginPwd");
const $logoutBtn = document.getElementById("logout");
const $list = document.getElementById("list");
const $alert = document.getElementById("alert");

let alertTimer=null;
function notify(msg,type="info",ttl=2200){
  $alert.textContent=msg;
  $alert.className=`alert ${type} show`;
  $alert.hidden=false;
  clearTimeout(alertTimer);
  alertTimer=setTimeout(()=>{
    $alert.classList.remove("show"); $alert.classList.add("hide");
    setTimeout(()=>{ $alert.hidden=true; $alert.classList.remove("hide"); },260);
  },ttl);
}
function isValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// ===== Time + State format =====
const fmtVN = new Intl.DateTimeFormat("vi-VN",{
  day:"2-digit",month:"2-digit",year:"numeric",
  hour:"2-digit",minute:"2-digit",second:"2-digit",
  hour12:false,timeZone:"Asia/Ho_Chi_Minh"
});
function stateVN(code){
  switch((code||"").toLowerCase()){
    case "charging": return "Đang sạc";
    case "full":     return "Đầy";
    default:         return "Không";
  }
}


function render(rows){
  if(!rows?.length){ $list.innerHTML='<div class="muted">Chưa có thiết bị</div>'; return; }
  rows.sort((a,b)=>a.device.localeCompare(b.device));
  $list.innerHTML = rows.map(row=>{
    const ts = row?.ts ? fmtVN.format(new Date(row.ts)).replace(", "," ") : "";
    const lv = Number(row?.level ?? 0);
    return `<div class="item">
      <div>
        <div class="dev">${row.device}</div>
        <div class="muted">${stateVN(row.state)} • ${ts}</div>
      </div>
      <div class="badge">${Number.isFinite(lv)?lv:0}%</div>
    </div>`;
  }).join("");
}

// ===== Data =====
async function load(){
  const { data, error } = await sb.from("battery").select("*");
  if(error){ console.error(error); notify("Lỗi tải dữ liệu ⛔️","error"); return; }
  render(data||[]);
}
let channel=null;
async function startRealtime(){
  if(channel) await sb.removeChannel(channel);
  channel = sb.channel("battery-realtime")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"battery"},load)
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"battery"},load)
    .subscribe(()=>load());
}

// ===== Gate (UI appear when session confirmation successful) ======
async function gate(session){
  if(!session){ $app.hidden=true; $auth.hidden=false; return; }
  $auth.hidden=true; $app.hidden=false; startRealtime();
}

// ===== Login flow: cred -> whitelist -> notify =====
$loginBtn.onclick = async ()=>{
  const emailRaw = $email.value.trim();
  const pwd = $password.value;

  if(!emailRaw || !pwd){
    $password.classList.remove("shake"); void $password.offsetWidth; $password.classList.add("shake");
    notify("Nhập email và mật khẩu ⛔️","error");
    return;
  }
  if(!isValidEmail(emailRaw)){
    notify("Định dạng email không hợp lệ ⛔️","error");
    $email.focus();
    return;
  }

  try{
    $loginBtn.classList.add("loading");
    const { data, error } = await sb.auth.signInWithPassword({ email: emailRaw, password: pwd });

    if(error){

      $password.classList.remove("shake"); void $password.offsetWidth; $password.classList.add("shake");
      notify("Email hoặc mật khẩu không đúng ⛔️","error");
      return;

    }


    const email = (data?.user?.email || "").toLowerCase();
    if(!ALLOWED_EMAILS.includes(email)){
      await sb.auth.signOut();
      notify("Email không được phép ⛔️","error");
      return;
    }

    notify("Đăng nhập thành công ✅","success"); // onAuthStateChange sẽ mở app
  } finally {
    $loginBtn.classList.remove("loading");
  }
};

$logoutBtn.onclick = async ()=>{ await sb.auth.signOut(); notify("Đã đăng xuất ✅","success"); };

// Key trigger
[$email,$password].forEach(i=>i.addEventListener("keyup",e=>{
  if(e.key==="Enter") $loginBtn.click();
}));

// ===== Init =====
sb.auth.onAuthStateChange((_e,s)=>gate(s));
sb.auth.getSession().then(({data})=>gate(data.session));
