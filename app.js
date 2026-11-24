const $ = id => document.getElementById(id);
const STORAGE_KEY = "tablero_marcacion_volumen_v1";
let records = [];
let activeView = "home";

const todayISO = () => new Date().toISOString().slice(0,10);
const parseDate = value => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  if (typeof value === "number" && window.XLSX) {
    const d = XLSX.SSF.parse_date_code(value);
    return d ? new Date(d.y,d.m-1,d.d) : null;
  }
  const s = String(value).trim();
  if (!s) return null;
  let d = new Date(s);
  if (!isNaN(d)) return d;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  return m ? new Date(+m[3],+m[2]-1,+m[1]) : null;
};
const dateText = d => d ? new Date(d).toLocaleDateString("es-CO") : "—";
const daysBetween = (a,b=new Date()) => a ? Math.max(0,Math.floor((b-a)/86400000)) : 0;
const norm = s => String(s??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
function load(){try{records=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{records=[]}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(records))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function showView(view){activeView=view;$("welcome").classList.add("hidden");$("homeView").classList.toggle("hidden",view!=="home");$("recordsView").classList.toggle("hidden",view!=="records");document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$("sidebar").classList.remove("open");if(view==="home")renderDashboard();else renderRecords()}
function isMarked(r){return ["marcado","marcada","terminado","terminada","finalizado","finalizada","publicado","publicada","completado","completada"].includes(norm(r.estado))}
function isInProgress(r){return ["en proceso","proceso","en curso","trabajando"].includes(norm(r.estado))}
function volumeTotals(){const map={};records.forEach(r=>{if(!map[r.volumen])map[r.volumen]={rows:[],official:0};map[r.volumen].rows.push(r);map[r.volumen].official=Math.max(map[r.volumen].official,Number(r.total)||0)});return map}
function statusOfVolume(v,rows,total){const marked=rows.filter(isMarked).length;const pct=total?marked/total*100:0;const now=new Date();const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();const expected=Math.min(100,now.getDate()/daysInMonth*100);const gap=pct-expected;const stuck=rows.some(r=>isInProgress(r)&&r.fechaInicio&&daysBetween(new Date(r.fechaInicio+"T00:00:00"))>7);let color=gap>=0?"green":gap>=-15?"yellow":"red";if(stuck)color="red";return {marked,total,pct,expected,gap,stuck,color,remaining:Math.max(0,total-marked)}}
function activeVolume(){const vols=volumeTotals();const names=Object.keys(vols);if(!names.length)return null;return names[names.length-1]}
function renderDashboard(){
  if(!records.length){$("welcome").classList.remove("hidden");$("homeView").classList.add("hidden");return}
  $("welcome").classList.add("hidden");$("homeView").classList.remove("hidden");
  const totals=volumeTotals(), vol=activeVolume(), info=totals[vol], total=info.official||info.rows.length, s=statusOfVolume(vol,info.rows,total);
  const allMarked=records.filter(isMarked).length, allTotal=Object.values(totals).reduce((a,v)=>a+(v.official||v.rows.length),0);
  const stuck=records.filter(r=>isInProgress(r)&&r.fechaInicio&&daysBetween(new Date(r.fechaInicio+"T00:00:00"))>7);
  const pct=total?s.pct:0, expected=s.expected, diff=pct-expected;
  const kpis=[
    ["Avance del volumen",`${Math.round(pct)}%`,`Meta: 100% · ${s.marked} de ${total} artículos`,s.color,"▥"],
    ["Avance esperado",`${Math.round(expected)}%`,`Referencia según el día ${new Date().getDate()} del mes`,"gray","◷"],
    ["Diferencia frente a lo esperado",`${diff>0?"+":""}${Math.round(diff)} pp`,`Real ${Math.round(pct)}% · esperado ${Math.round(expected)}%`,diff>=0?"green":diff>=-15?"yellow":"red","↗"],
    ["En proceso > 7 días",`${stuck.length}`,`${stuck.length} artículo(s) requieren atención`,stuck.length?"red":"green","!"]
  ];
  $("kpiGrid").innerHTML=kpis.map(k=>`<article class="kpi"><div class="kpi-top">${k[0]}<span class="kpi-icon">${k[4]}</span></div><div class="kpi-value">${k[1]}</div><div class="kpi-meta">${k[2]}</div><div style="margin-top:12px"><span class="status-pill ${k[3]}">${k[3]==="green"?"VERDE":k[3]==="yellow"?"AMARILLO":k[3]==="red"?"ROJO":"REFERENCIA"}</span></div></article>`).join("");
  $("progressChart").innerHTML=Object.entries(totals).map(([name,v])=>{const n=v.official||v.rows.length;const x=statusOfVolume(name,v.rows,n);return `<div class="bar-row"><div class="bar-label" title="${esc(name)}">${esc(name)}</div><div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,x.pct)}%"></div></div><div class="bar-track" style="height:4px;margin-top:4px"><div class="bar-fill expected" style="width:${Math.min(100,x.expected)}%"></div></div></div><div class="bar-value">${Math.round(x.pct)}%</div></div>`}).join("")+`<div class="legend"><span><i style="background:#0c7235"></i>Avance real</span><span><i style="background:#b9c8bd"></i>Esperado a la fecha</span></div>`;
  const counts={"Marcado":records.filter(isMarked).length,"En proceso":records.filter(isInProgress).length,"Pendiente":records.filter(r=>norm(r.estado)==="pendiente").length,"Detenido":records.filter(r=>norm(r.estado)==="detenido").length};
  const colors=["#0c7235","#4f8bd6","#aab4ad","#f7941d"];const vals=Object.values(counts),sum=vals.reduce((a,b)=>a+b,0)||1;let acc=0;const stops=vals.map((v,i)=>{const start=acc;acc+=v/sum*100;return `${colors[i]} ${start}% ${acc}%`}).join(",");
  $("statusChart").innerHTML=`<div class="status-layout"><div class="donut" style="background:conic-gradient(${stops})"><div class="donut-center">${sum===1&&vals.every(v=>!v)?0:sum}<small>artículos</small></div></div><div class="status-legend">${Object.entries(counts).map(([k,v],i)=>`<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colors[i]};margin-right:7px"></i>${k}<b>${v}</b></span>`).join("")}</div></div>`;
  const redRows=records.filter(r=>{const age=isInProgress(r)&&r.fechaInicio?daysBetween(new Date(r.fechaInicio+"T00:00:00")):0;return age>7 || (r.volumen===vol && !isMarked(r) && s.color==="red")});
  $("attentionCount").textContent=`${redRows.length} pendientes`;
  $("attentionList").innerHTML=redRows.length?redRows.map(r=>{const age=r.fechaInicio?daysBetween(new Date(r.fechaInicio+"T00:00:00")):0;const action=age>7?"Priorizar este artículo atascado en los próximos 5 días hábiles.": "Priorizar los pendientes del volumen en curso; si sigue en rojo en la próxima revisión, escalar a la editora.";return `<div class="attention-item"><div><strong>${esc(r.articulo)}</strong><p>${esc(r.volumen)} · ${esc(r.estado)}${age?` · ${age} días desde el inicio`:""}</p></div><div class="attention-action">${action}</div></div>`}).join(""):`<div class="empty-row">No hay registros en rojo. Continúa con la revisión quincenal.</div>`;
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderRecords(){
  const q=norm($("recordSearch").value),vf=$("volumeFilter").value,sf=$("stateFilter").value;
  const vols=[...new Set(records.map(r=>r.volumen))];$("volumeFilter").innerHTML='<option value="">Todos los volúmenes</option>'+vols.map(v=>`<option ${vf===v?"selected":""}>${esc(v)}</option>`).join("");
  const rows=records.map((r,i)=>({...r,_i:i})).filter(r=>(!q||norm(r.articulo+" "+r.volumen).includes(q))&&(!vf||r.volumen===vf)&&(!sf||r.estado===sf));
  $("recordsBody").innerHTML=rows.length?rows.map(r=>{const age=isInProgress(r)&&r.fechaInicio?daysBetween(new Date(r.fechaInicio+"T00:00:00")):0;const late=age>7;return `<tr><td>${esc(r.volumen)}</td><td>${esc(r.articulo)}</td><td><span class="state-tag state-${r.estado.replace(/\s/g,"-")}">${esc(r.estado)}</span></td><td>${dateText(r.fechaInicio)}</td><td>${dateText(r.fechaFin)}</td><td>${age||"—"}</td><td><span class="status-pill ${late?"red":"green"}">${late?"ROJO":"VERDE"}</span></td><td><button class="action-link" data-edit="${r._i}">Editar</button><button class="action-link" data-delete="${r._i}">Eliminar</button></td></tr>`}).join(""):`<tr><td colspan="8" class="empty-row">No hay registros para mostrar.</td></tr>`;
  $("recordCount").textContent=`Mostrando ${rows.length} de ${records.length} registros`;
  $("recordsBody").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openForm(+b.dataset.edit));
  $("recordsBody").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{if(confirm("¿Eliminar este registro?")){records.splice(+b.dataset.delete,1);save();renderRecords();renderDashboard()}});
}
function openForm(i=null){$("recordForm").reset();$("editIndex").value=i??"";$("modalTitle").textContent=i===null?"Agregar registro":"Editar registro";if(i!==null){const r=records[i];$("fVolume").value=r.volumen;$("fArticle").value=r.articulo;$("fState").value=r.estado;$("fStart").value=r.fechaInicio||"";$("fEnd").value=r.fechaFin||"";$("fTotal").value=r.total||""}$("modal").classList.remove("hidden")}
function closeForm(){$("modal").classList.add("hidden")}
function headerKey(obj,keys){for(const k of Object.keys(obj)){if(keys.includes(norm(k)))return obj[k]}return ""}
function importRows(rows){
  const incoming=rows.filter(x=>Object.values(x).some(v=>String(v??"").trim())).map(x=>({
    volumen:String(headerKey(x,["volumen","volume"])||"Sin volumen").trim(),
    articulo:String(headerKey(x,["articulo","artículo","article","codigo","codigo articulo"])||"").trim(),
    estado:canonicalState(headerKey(x,["estado","status"])),
    fechaInicio:toISO(headerKey(x,["fecha de inicio","fecha inicio","fechainicio","inicio","start date"])),
    fechaFin:toISO(headerKey(x,["fecha de fin","fecha fin","fechafin","fin","end date"])),
    total:Number(headerKey(x,["total volumen","total de articulos","total de artículos","total volumen articulos","total"]))||0
  })).filter(r=>r.articulo);
  if(!incoming.length){toast("No se encontraron filas con artículo.");return}
  let added=0,updated=0,duplicates=0;
  incoming.forEach(n=>{const idx=records.findIndex(r=>r.volumen===n.volumen&&r.articulo===n.articulo);if(idx<0){records.push(n);added++}else if(JSON.stringify(records[idx])!==JSON.stringify(n)){records[idx]={...records[idx],...n};updated++}else duplicates++});
  save();toast(`Importación: ${added} nuevos, ${updated} actualizados, ${duplicates} sin cambios.`);showView("home");
}
function canonicalState(v){const n=norm(v);if(["marcado","marcada","terminado","terminada","finalizado","finalizada","publicado","publicada","completado","completada"].includes(n))return "Marcado";if(n.includes("deten"))return "Detenido";if(n.includes("pend"))return "Pendiente";return "En proceso"}
function toISO(v){const d=parseDate(v);return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`:""}
function readFile(file){const reader=new FileReader();reader.onload=e=>{try{let rows;if(file.name.toLowerCase().endsWith(".csv")){const wb=XLSX.read(e.target.result,{type:"string"});rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""})}else{const wb=XLSX.read(e.target.result,{type:"array",cellDates:true});rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""})}importRows(rows)}catch(err){alert("No fue posible leer el archivo. Verifica que sea Excel o CSV.");console.error(err)}};if(file.name.toLowerCase().endsWith(".csv"))reader.readAsText(file);else reader.readAsArrayBuffer(file)}
$("fileInput").addEventListener("change",e=>{if(e.target.files[0])readFile(e.target.files[0]);e.target.value=""});
$("importAgain").onclick=()=>$("fileInput").click();
$("addRecord").onclick=()=>openForm();
$("closeModal").onclick=$("cancelModal").onclick=closeForm;
$("recordForm").onsubmit=e=>{e.preventDefault();const r={volumen:$("fVolume").value.trim(),articulo:$("fArticle").value.trim(),estado:$("fState").value,fechaInicio:$("fStart").value,fechaFin:$("fEnd").value,total:Number($("fTotal").value)||0};const i=$("editIndex").value;if(i==="")records.push(r);else records[+i]=r;save();closeForm();renderRecords();renderDashboard();toast("Registro guardado.")};
$("deleteAll").onclick=()=>{if(confirm("Esta acción eliminará todos los registros guardados en este navegador. ¿Deseas continuar?")){records=[];save();renderRecords();renderDashboard();$("welcome").classList.remove("hidden");$("recordsView").classList.add("hidden");toast("Se eliminaron todos los registros.")}};
$("recordSearch").oninput=renderRecords;$("volumeFilter").onchange=renderRecords;$("stateFilter").onchange=renderRecords;
$("globalSearch").oninput=e=>{const q=e.target.value;if(q){showView("records");$("recordSearch").value=q;renderRecords()}};
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>showView(b.dataset.view));
$("mobileMenu").onclick=()=>$("sidebar").classList.toggle("open");
$("cutoffDate").textContent=new Date().toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"});
load();if(records.length)showView("home");else $("welcome").classList.remove("hidden");
