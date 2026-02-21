const STORAGE = {
  teacherSession: "gg_teacher_session",
  studentJoin: "gg_student_join"
};

const PACKS = [
  { id: "present-simple", title: "Present Simple", file: "packs/present-simple.json" },
  { id: "present-continuous", title: "Present Continuous", file: "packs/present-continuous.json" },
  { id: "present-vs-continuous", title: "Present Simple vs Present Continuous", file: "packs/present-vs-continuous.json" }
];

function $(id){ return document.getElementById(id); }

function randCode(prefix="KAN"){
  const n = Math.floor(1000 + Math.random()*9000);
  return `${prefix}-${n}`;
}

function safeTrimList(csv){
  return csv.split(",").map(s => s.trim()).filter(Boolean);
}

function getBaseUrl(){
  return window.location.origin + window.location.pathname.replace(/index\.html$/,"");
}

function setTab(tab){
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add("active");
  $("panelTeacher").style.display = tab === "teacher" ? "block" : "none";
  $("panelStudent").style.display = tab === "student" ? "block" : "none";
}

function saveTeacherSession(session){
  localStorage.setItem(STORAGE.teacherSession, JSON.stringify(session));
}
function loadTeacherSession(){
  const raw = localStorage.getItem(STORAGE.teacherSession);
  return raw ? JSON.parse(raw) : null;
}

function saveStudentJoin(join){
  localStorage.setItem(STORAGE.studentJoin, JSON.stringify(join));
}
function loadStudentJoin(){
  const raw = localStorage.getItem(STORAGE.studentJoin);
  return raw ? JSON.parse(raw) : null;
}

function resetDevice(){
  localStorage.removeItem(STORAGE.teacherSession);
  localStorage.removeItem(STORAGE.studentJoin);
  window.location.href = "index.html";
}

function populatePacks(){
  const sel = $("teacherPack");
  sel.innerHTML = "";
  for(const p of PACKS){
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.title;
    sel.appendChild(opt);
  }
}

function renderLobby(session){
  $("teacherLobby").style.display = "block";
  $("studentWaiting").style.display = "none";

  $("lobbyTitle").textContent = `Teacher Lobby • ${session.className || "Class Session"}`;
  $("lobbyMeta").textContent =
    `Code: ${session.code} • Mode: ${session.mode === "whole" ? "Whole Class" : "Solo"} • Calm Mode: ${session.calm ? "On" : "Off"} • Pack: ${session.packId} • Game: ${session.gameId}`;

  const teamsList = $("teamsList");
  teamsList.innerHTML = "";
  session.teams.forEach(t=>{
    const div = document.createElement("div");
    div.className = "badge";
    div.innerHTML = `<span class="dot"></span><div><div style="font-weight:900">${escapeHtml(t.name)}</div><div class="muted small">Score: ${t.score}</div></div>`;
    teamsList.appendChild(div);
  });

  const sb = $("scoreboard");
  sb.innerHTML = "";
  const sorted = [...session.teams].sort((a,b)=>b.score-a.score);
  sorted.forEach((t, idx)=>{
    const div = document.createElement("div");
    div.className = "badge";
    const dotClass = idx === 0 ? "good" : idx === sorted.length-1 ? "warn" : "";
    div.innerHTML = `
      <span class="dot ${dotClass}"></span>
      <div style="width:100%">
        <div class="kpi"><span>${idx+1}. ${escapeHtml(t.name)}</span><span>${t.score}</span></div>
        <div class="muted small">${t.correct} correct • ${t.wrong} try-agains</div>
      </div>
    `;
    sb.appendChild(div);
  });
}

function renderStudentWaiting(code){
  $("teacherLobby").style.display = "none";
  $("studentWaiting").style.display = "block";
  $("studentWaitingCode").textContent = code;
}

function escapeHtml(str){
  return (str ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function buildSessionFromTeacherUI(){
  const className = $("teacherClassName").value.trim();
  const mode = $("teacherMode").value;
  const calm = $("teacherCalm").checked;
  const teams = safeTrimList($("teacherTeams").value);
  const packId = $("teacherPack").value;
  const gameId = $("teacherGame").value;

  const code = randCode("KAN");

  return {
    version: 1,
    code,
    className,
    mode,
    calm,
    packId,
    gameId,
    teams: teams.map(name => ({ name, score: 0, correct: 0, wrong: 0 })),
    createdAt: Date.now()
  };
}

function getPack(packId){
  const p = PACKS.find(x => x.id === packId);
  if(!p) throw new Error("Pack not found: " + packId);
  return p;
}

function startGame(session){
  const pack = getPack(session.packId);
  const params = new URLSearchParams({
    code: session.code,
    pack: pack.file,
    packId: session.packId,
    mode: session.mode,
    calm: session.calm ? "1" : "0"
  });

  const url = `games/${session.gameId}.html?${params.toString()}&teacher=1`;
  window.location.href = url;
}

function wireUI(){
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=> setTab(btn.dataset.tab));
  });

  $("btnReset").addEventListener("click", resetDevice);
  $("btnGoHome").addEventListener("click", ()=> window.location.href = "index.html");

  populatePacks();

  $("btnCreateSession").addEventListener("click", ()=>{
    const session = buildSessionFromTeacherUI();
    saveTeacherSession(session);

    const base = getBaseUrl();
    const joinLink = `${base}index.html#join?code=${encodeURIComponent(session.code)}`;

    $("joinUrl").textContent = joinLink;
    $("joinCode").textContent = session.code;
    $("teacherCreated").style.display = "block";

    $("btnCopyJoin").onclick = async ()=>{
      try{
        await navigator.clipboard.writeText(joinLink);
        $("btnCopyJoin").textContent = "Copied!";
        setTimeout(()=> $("btnCopyJoin").textContent = "Copy Join Link", 1000);
      }catch{
        alert("Copy failed. You can manually copy the link shown.");
      }
    };

    // Always works (even if session was created earlier)
$("btnLaunchTeacher").addEventListener("click", ()=>{
  const session = loadTeacherSession();
  if(!session) return alert("No active session found. Click 'Create Join Code' first.");
  renderLobby(session);
  window.location.hash = "#teacher";
});
  });

  $("btnEndSession").addEventListener("click", ()=>{
    localStorage.removeItem(STORAGE.teacherSession);
    window.location.href = "index.html";
  });

  $("btnStartGame").addEventListener("click", ()=>{
    const session = loadTeacherSession();
    if(!session) return alert("No active session found.");
    startGame(session);
  });

  $("btnJoin").addEventListener("click", ()=>{
    const code = $("studentCode").value.trim().toUpperCase();
    if(!code) return alert("Enter the join code.");
    saveStudentJoin({ code, joinedAt: Date.now() });

    $("studentJoined").style.display = "block";
    renderStudentWaiting(code);
  });

  $("btnStudentLeave").addEventListener("click", ()=>{
    localStorage.removeItem(STORAGE.studentJoin);
    window.location.href = "index.html#join";
  });

  $("btnStudentClear").addEventListener("click", ()=>{
    localStorage.removeItem(STORAGE.studentJoin);
    window.location.href = "index.html#join";
  });
}

function routeOnLoad(){
  const hash = window.location.hash || "";
  const studentJoin = loadStudentJoin();
  const teacherSession = loadTeacherSession();

  setTab("teacher");

  if(hash.startsWith("#join")){
    setTab("student");
    const qp = hash.split("?")[1];
    if(qp){
      const sp = new URLSearchParams(qp);
      const code = (sp.get("code") || "").toUpperCase();
      if(code) $("studentCode").value = code;
    }
  }

  if(hash.startsWith("#teacher") && teacherSession){
    renderLobby(teacherSession);
  }

  if(studentJoin && !hash.startsWith("#teacher")){
    renderStudentWaiting(studentJoin.code);
    setTab("student");
    $("studentJoined").style.display = "block";
  }
}

window.addEventListener("load", ()=>{
  wireUI();
  routeOnLoad();
});