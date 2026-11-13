
const K=.663;
const BORDER=[[22.15,48.4],[22.9,49.05],[23.55,50.4],[23.65,51.0],[23.6,51.6],[24.1,51.9],[26.0,51.9],[27.5,51.6],[29.0,51.5],[30.2,51.45],[31.5,52.1],[32.8,52.3],[34.4,52.2],[35.5,51.3],[36.6,50.3],[37.9,50.4],[39.6,50.0],[40.15,49.5],[39.9,48.3],[38.7,47.8],[38.2,47.1],[36.8,46.75],[35.4,46.4],[35.0,45.9],[36.5,45.4],[36.3,45.0],[35.4,44.85],[34.4,44.5],[33.55,44.55],[33.5,45.1],[32.5,45.4],[33.0,45.9],[33.7,46.2],[32.5,46.1],[31.6,46.65],[30.7,46.45],[30.1,45.8],[29.7,45.2],[28.9,45.3],[28.2,45.45],[28.25,46.5],[28.9,47.2],[29.6,47.9],[28.8,48.3],[27.6,48.5],[26.6,48.25],[26.0,48.2],[24.9,47.7],[24.2,47.9],[23.1,48.1],[22.6,47.95]].map(p=>[(p[0]-22)*K,52.5-p[1]]);
const R=[["Волинська","Вол",25.3,51.2],["Рівненська","Рів",26.3,50.8],["Житомирська","Жит",28.5,50.7],["м. Київ","Київ",30.52,50.45],["Чернігівська","Чер",31.8,51.3],["Сумська","Сум",34.2,50.8],["Харківська","Хар",36.4,49.6],["Луганська","Луг",39.0,48.9],
["Львівська","Льв",24.0,49.6],["Тернопільська","Тер",25.5,49.5],["Хмельницька","Хме",26.9,49.5],["Київська","Киї",30.3,50.0],["Черкаська","Чрк",31.8,49.2],["Полтавська","Пол",33.6,49.6],["Дніпропетровська","Дніп",35.0,48.5],["Донецька","Дон",37.7,48.2],
["Закарпатська","Зак",23.0,48.5],["Івано-Франківська","ІФ",24.6,48.7],["Чернівецька","Чрв",25.8,48.3],["Вінницька","Він",28.5,49.1],["Кіровоградська","Кір",32.3,48.5],["Запорізька","Зап",35.3,47.4],
["Одеська","Оде",30.3,46.9],["Миколаївська","Мик",31.9,47.2],["Херсонська","Хер",33.4,46.6],["Крим","Крим",34.2,45.2]];
R.forEach(r=>{r.x=(r[2]-22)*K;r.y=52.5-r[3]});
const CITY=3,N=R.length;
const L=[{n:"Спокійно",c:"#34c759",a:"Загроз немає. Можна жити звичайним життям."},{n:"Підвищена увага",c:"#ffd60a",a:"Стежте за повідомленнями й тримайте телефон поруч."},{n:"Повітряна тривога",c:"#ff453a",a:"Прямуйте в укриття."},{n:"Критична небезпека",c:"#bf5af2",a:"Негайно в укриття й не виходьте до відбою."}];
const st=R.map(()=>0), since=R.map(()=>Date.now()), log=[], hist=[];
const NB=R.map((a,i)=>R.map((b,j)=>j).filter(j=>j!=i&&Math.hypot(a.x-R[j].x,a.y-R[j].y)<2.2));
let my=11, ac=null;
try{const s=localStorage.getItem("my");if(s!==null&&R[+s])my=+s}catch(e){}
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
const $=s=>document.querySelector(s);
const hm=d=>new Date(d).toLocaleTimeString("uk-UA",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

function inside(x,y){let c=false;for(let i=0,j=BORDER.length-1;i<BORDER.length;j=i++){const a=BORDER[i],b=BORDER[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
function near(x,y){
  if(Math.hypot(x-R[CITY].x,y-R[CITY].y)<.28)return{r:CITY,g:9};
  let d1=1e9,d2=1e9,r=0;
  for(let i=0;i<N;i++){if(i==CITY)continue;const d=Math.hypot(x-R[i].x,y-R[i].y);if(d<d1){d2=d1;d1=d;r=i}else if(d<d2)d2=d}
  return{r,g:d2-d1};
}
const D=[],G=.17;
for(let row=0,y=.1;y<8.3;y+=G*.866,row++)for(let x=.1+(row%2?G/2:0);x<12.3;x+=G){
  if(!inside(x,y))continue;const n=near(x,y);if(n.g<.09)continue;
  D.push({x,y,r:n.r,ph:Math.random()*6.28});
}

const cv=$("#cv"),cx=cv.getContext("2d");let W,H,S,OX,OY,dpr;
function size(){dpr=devicePixelRatio||1;W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;S=Math.min(W/12.3,H/8.3);OX=(W-12.3*S)/2;OY=(H-8.3*S)/2;}
new ResizeObserver(size).observe(cv);size();

function frame(t){
  if(RM)t=0;
  cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,W,H);
  const sw=(t/5000%1)*6.283, pr=S*G*.34;
  for(const d of D){
    const l=st[d.r],px=OX+d.x*S,py=OY+d.y*S,sel=d.r==my;
    let a=l?.95:.3,r=pr*(l?1.15:.85);
    if(sel){a=Math.min(1,a+.35);r*=1.2}
    if(!RM){
      let da=(Math.atan2(py-H/2,px-W/2)+6.283-sw)%6.283;a+=Math.max(0,1-da/.9)*.35;
      if(l>=2)r*=1+.28*Math.sin(t/(l==3?140:380)+d.ph);
    }
    cx.globalAlpha=Math.min(1,a);cx.fillStyle=L[l].c;cx.beginPath();cx.arc(px,py,r,0,6.283);cx.fill();
  }
  cx.globalCompositeOperation="lighter";
  for(let i=0;i<N;i++){
    if(st[i]<2)continue;
    const px=OX+R[i].x*S,py=OY+R[i].y*S,ph=RM?.4:((t/(st[i]==3?900:1700)+i*.37)%1);
    cx.globalAlpha=(1-ph)*.7;cx.strokeStyle=L[st[i]].c;cx.lineWidth=2;cx.beginPath();cx.arc(px,py,S*(i==CITY?.25:.2)+ph*S*1.1,0,6.283);cx.stroke();
    const g=cx.createRadialGradient(px,py,0,px,py,S*.9);g.addColorStop(0,L[st[i]].c+"66");g.addColorStop(1,L[st[i]].c+"00");
    cx.globalAlpha=.7;cx.fillStyle=g;cx.beginPath();cx.arc(px,py,S*.9,0,6.283);cx.fill();
  }
  cx.globalCompositeOperation="source-over";
  cx.textAlign="center";cx.textBaseline="middle";cx.font=`600 ${Math.max(8,S*.17)}px -apple-system,"SF Pro Text","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif`;
  for(let i=0;i<N;i++){
    if(!st[i]&&i!=my&&S<48)continue;
    cx.globalAlpha=st[i]||i==my?1:.5;cx.fillStyle="#fff";cx.shadowColor="#000";cx.shadowBlur=6;
    cx.fillText(i==my?"● "+R[i][1]:R[i][1],OX+R[i].x*S,OY+R[i].y*S);
  }
  cx.shadowBlur=0;cx.globalAlpha=1;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

cv.addEventListener("click",e=>{
  const b=cv.getBoundingClientRect(),x=((e.clientX-b.left)-OX)/S,y=((e.clientY-b.top)-OY)/S;
  pick(near(x,y).r);
});


const LN=L.map(x=>x.n);
let mode="demo",updated=null,err="",locked=false,hasPin=false,hasToken=false,iv=30,sheetKind="",warnTxt="";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const tabs=[...document.querySelectorAll(".tabbar button")];
function tab(t){document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on",x.id==="t-"+t));tabs.forEach(x=>x.classList.toggle("on",x.dataset.t===t))}
tabs.forEach(b=>b.onclick=()=>tab(b.dataset.t));
$("#sel").innerHTML=R.map((r,i)=>`<option value="${i}">${r[0]}</option>`).join("");
$("#sel").onchange=e=>pick(+e.target.value);
function pick(i){my=i;api.setSettings({region:i});ui()}
function beep(){
  try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();
    [0,.35,.7].forEach(d=>{const o=ac.createOscillator(),g=ac.createGain();o.type="sine";o.frequency.value=d%.7?740:988;g.gain.value=.14;o.connect(g);g.connect(ac.destination);o.start(ac.currentTime+d);o.stop(ac.currentTime+d+.25)});}catch(e){}
}
function ui(){
  const l=st[my],n=st.filter(x=>x>=2).length,idx=Math.min(100,Math.round(st.reduce((a,b)=>a+b,0)/(N*3)*220));
  $("#rn").textContent=R[my][0]+" · з "+hm(since[my]);
  $("#lv").textContent=L[l].n;$("#lv").style.color=L[l].c;$("#adv").textContent=L[l].a;
  $("#cnt").textContent=n;$("#idx").textContent=idx;$("#bar i").style.width=idx+"%";
  $("#sel").value=my;
  $("#stage").classList.toggle("hot",l>=2&&!RM);
  $("#log").innerHTML=log.map(e=>`<li class="row"><span class="dot" style="background:${L[e.v].c}"></span><span class="grow">${esc(e.s)}</span><time>${hm(e.t)}</time></li>`).join("")||'<li class="row"><span class="val">Змін поки немає</span></li>';
  const h=hist.slice(-36),m=Math.max(4,...h);
  $("#sp").setAttribute("points",h.map((v,i)=>`${(i/Math.max(1,h.length-1)*110).toFixed(1)},${(28-v/m*26).toFixed(1)}`).join(" "));
  $("#mode").dataset.m=mode;
  $("#mt").textContent=({live:"Реальні дані",demo:"Демо-режим",offline:"Немає зв’язку"})[mode]+(updated?" · "+hm(updated):"");
  let t=err||warnTxt;
  if(mode==="offline"&&updated)t+=" Показано останні відомі дані з "+hm(updated)+(Date.now()-updated>300000?" — вони можуть бути застарілими, орієнтуйтеся на офіційні оповіщення.":".");
  if(mode==="demo")t="Токен не вказано — працює демо-режим із випадковими даними.";
  t=t.trim();
  $("#st").textContent=mode==="live"?"Працює":(mode==="demo"?"Демо":"Немає зв’язку");
  $("#warn").hidden=!(mode==="offline"&&t);$("#warn").textContent=t;
}
function lockUi(){
  $("#t-set").classList.toggle("locked",locked);$("#lockb").hidden=!locked;
  $("#pinst").textContent=hasPin?"Увімкнено":"Вимкнено";
  $("#pinl").textContent=hasPin?"Змінити PIN":"Задати PIN";$("#pinr").hidden=!hasPin;
  $("#tk").placeholder=hasToken?"Збережено":"Вставте токен";
}
function segUi(){document.querySelectorAll("#iv button").forEach(b=>b.classList.toggle("on",+b.dataset.v===iv))}
document.querySelectorAll("#iv button").forEach(b=>b.onclick=()=>{iv=+b.dataset.v;segUi()});

const SH={unlock:["Введіть PIN","Налаштування захищені PIN-кодом.",1,0],set:["Новий PIN","Від 4 до 8 цифр.",0,1],change:["Змінити PIN","Введіть поточний і новий PIN.",1,1],remove:["Вимкнути PIN","Введіть поточний PIN.",1,0]};
function sheet(k){
  sheetKind=k;const c=SH[k];$("#she").textContent="";$("#shi").value="";$("#shn").value="";
  $("#sht").textContent=c[0];$("#shp").textContent=c[1];$("#shi").hidden=!c[2];$("#shn").hidden=!c[3];
  $("#sheet").hidden=false;(c[2]?$("#shi"):$("#shn")).focus();
}
$("#shc").onclick=()=>{$("#sheet").hidden=true};
$("#sho").onclick=async()=>{
  const cur=$("#shi").value,nxt=$("#shn").value;
  const r=sheetKind==="unlock"?await api.unlock(cur):await api.setPin({current:cur,next:sheetKind==="remove"?"":nxt});
  if(r.ok){$("#sheet").hidden=true;locked=r.locked;hasPin=r.hasPin;lockUi()}else $("#she").textContent=r.error||"Не вдалося.";
};
addEventListener("keydown",e=>{if(e.key==="Escape")$("#sheet").hidden=true;if(e.key==="Enter"&&!$("#sheet").hidden)$("#sho").click()});
$("#unl").onclick=()=>sheet("unlock");
$("#pinb").onclick=()=>sheet(hasPin?"change":"set");
$("#pinr").onclick=()=>sheet("remove");

function take(s){
  st.splice(0,N,...s.levels);since.splice(0,N,...s.since);log.splice(0,log.length,...s.log);hist.splice(0,hist.length,...s.hist);
  mode=s.mode;updated=s.updated;err=s.error||"";ui();
}
api.onState(take);api.onBeep(beep);api.onLock(s=>{locked=s.locked;hasPin=s.hasPin;lockUi()});
$("#tb").onclick=()=>{beep();api.setSettings({test:true})};
$("#sv").onclick=async()=>{
  const p={interval:iv,autostart:$("#as").checked},t=$("#tk").value.trim();if(t)p.token=t;
  const r=await api.setSettings(p);
  if(r.error==="locked"){sheet("unlock");return}
  if(!r.ok){warnTxt=r.error||"";mode==="offline"||($("#st").textContent=warnTxt);return}
  $("#tk").value="";hasToken=r.hasToken;warnTxt=r.warn||"";lockUi();ui();
  $("#sv").textContent="Збережено";setTimeout(()=>{$("#sv").textContent="Зберегти"},1500);
};
$("#ct").onclick=async()=>{
  const r=await api.setSettings({token:""});
  if(r.error==="locked"){sheet("unlock");return}
  hasToken=false;lockUi();
};
(async()=>{
  const i=await api.init(),s=i.settings;
  my=s.region;iv=s.interval;segUi();$("#as").checked=s.autostart;hasToken=s.hasToken;locked=s.locked;hasPin=s.hasPin;lockUi();
  take(i.state);
})();
