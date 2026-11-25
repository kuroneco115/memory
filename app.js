const KEY="memory-core-v1-records";
const $=id=>document.getElementById(id);
let records=load();
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function persist(){localStorage.setItem(KEY,JSON.stringify(records));render()}
function dateNow(){return new Date().toISOString()}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function render(){
  $("totalCount").textContent=records.length;
  $("confirmedCount").textContent=records.filter(r=>r.status==="確定").length;
  $("activeCount").textContent=records.filter(r=>r.status==="検討中").length;
  const q=$("search").value.toLowerCase().trim(), cat=$("categoryFilter").value, status=$("statusFilter").value;
  const filtered=records.filter(r=>{
    const hay=[r.title,r.summary,r.details,r.decisions,r.pending,r.actions,(r.tags||[]).join(" ")].join(" ").toLowerCase();
    return (!q||hay.includes(q))&&(!cat||r.category===cat)&&(!status||r.status===status);
  }).sort((a,b)=>(b.updated||"").localeCompare(a.updated||""));
  const list=$("recordList");
  if(!filtered.length){list.innerHTML='<div class="empty">記録はまだありません。<br>「＋ 新規記録」から最初の記憶を保存できます。</div>';return}
  list.innerHTML=filtered.map(r=>`<article class="record">
    <div class="record-top"><span class="pill">${esc(r.category)}</span><span class="pill status-${esc(r.status)}">${esc(r.status)}</span></div>
    <h4>${esc(r.title)}</h4><p>${esc(r.summary||"概要なし")}</p>
    <div class="meta">更新：${esc((r.updated||"").slice(0,10))}</div>
    ${(r.tags||[]).length?`<div class="tags">${r.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join("")}</div>`:""}
    <div class="actions"><button class="outline" onclick="editRecord('${r.id}')">開く・編集</button><button class="danger-outline" onclick="deleteRecord('${r.id}')">削除</button></div>
  </article>`).join("");
}
function editRecord(id){
  const r=records.find(x=>x.id===id);if(!r)return;
  $("formTitle").textContent="記録を編集";$("recordId").value=r.id;
  ["title","category","status","summary","details","decisions","pending","actions"].forEach(k=>$(k).value=r[k]||"");
  $("tags").value=(r.tags||[]).join(", ");$("editor").showModal();
}
function deleteRecord(id){if(confirm("この記録を削除しますか？")){records=records.filter(r=>r.id!==id);persist()}}
function resetForm(){
  $("formTitle").textContent="新しい記録";$("recordId").value="";
  ["title","summary","details","decisions","pending","actions","tags"].forEach(k=>$(k).value="");
  $("category").value="アイデア";$("status").value="検討中";
}
$("newBtn").onclick=()=>{resetForm();$("editor").showModal()};
$("closeEditor").onclick=()=>$("editor").close();
$("recordForm").onsubmit=e=>{
  e.preventDefault();const id=$("recordId").value||crypto.randomUUID();
  const old=records.find(r=>r.id===id);
  const item={id,title:$("title").value.trim(),category:$("category").value,status:$("status").value,summary:$("summary").value.trim(),details:$("details").value.trim(),decisions:$("decisions").value.trim(),pending:$("pending").value.trim(),actions:$("actions").value.trim(),tags:$("tags").value.split(",").map(t=>t.trim()).filter(Boolean),created:old?.created||dateNow(),updated:dateNow(),history:old?.history||[]};
  if(old){item.history.push({updated:old.updated,previous_status:old.status,previous_title:old.title});records=records.map(r=>r.id===id?item:r)}else records.unshift(item);
  persist();$("editor").close();
};
$("search").oninput=render;$("categoryFilter").onchange=render;$("statusFilter").onchange=render;
$("clearSearch").onclick=()=>{ $("search").value=""; render(); };
document.querySelectorAll(".quick[data-category]").forEach(btn=>btn.onclick=()=>{
  const category=btn.dataset.category;
  const currently=$("categoryFilter").value;
  $("categoryFilter").value=currently===category?"":category;
  document.querySelectorAll(".quick").forEach(b=>b.classList.toggle("selected",b.dataset.category===$("categoryFilter").value));
  $("listHeading").textContent=$("categoryFilter").value?`${category}の記録`:"最近の記録";
  render();
});
function setView(view){
  const home=$("homeView"), tools=$("toolsView");
  if(view==="library"){home.classList.add("hidden");tools.classList.remove("hidden");}
  else {home.classList.remove("hidden");tools.classList.add("hidden");}
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===view||(view==="search"&&n.dataset.view==="search")));
  if(view==="search"){$("search").focus();window.scrollTo({top:0,behavior:"smooth"});}
  if(view==="home"){$("search").value="";$("categoryFilter").value="";render();}
}
document.querySelectorAll(".nav-item").forEach(btn=>btn.onclick=()=>{
 const v=btn.dataset.view;
 if(v==="record"){resetForm();$("editor").showModal();return;}
 if(v==="search"){setView("search");return;}
 setView(v);
});
$("menuBtn").onclick=()=>setView("library");

function download(filename,content,type){const blob=new Blob([content],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$("exportBtn").onclick=()=>download("memory-core-backup.json",JSON.stringify({schema:"memory-core-v1",exported_at:dateNow(),records},null,2),"application/json");
$("importBtn").onclick=()=>$("fileInput").click();
$("fileInput").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{const data=JSON.parse(await file.text());const incoming=Array.isArray(data)?data:data.records;if(!Array.isArray(incoming))throw Error("recordsが見つかりません");
    const map=new Map(records.map(r=>[r.id,r]));incoming.forEach(r=>{if(r.id)map.set(r.id,r)});records=[...map.values()];
    persist();alert(`${incoming.length}件を取り込みました（同じIDは更新）。`);
  }catch(err){alert("読み込みに失敗しました："+err.message)}e.target.value="";
};
$("markdownBtn").onclick=()=>{
  const lines=["# Memory Core Export",`Exported: ${new Date().toLocaleString("ja-JP")}`,""];
  records.slice().sort((a,b)=>(b.updated||"").localeCompare(a.updated||"")).forEach(r=>{
    lines.push(`## ${r.title||"無題"}`,`- Category: ${r.category}`,`- Status: ${r.status}`,`- Updated: ${(r.updated||"").slice(0,10)}`,"");
    if(r.summary)lines.push("### 概要",r.summary,"");
    if(r.details)lines.push("### 詳細・経緯",r.details,"");
    if(r.decisions)lines.push("### 決定事項",r.decisions,"");
    if(r.pending)lines.push("### 保留・未確認",r.pending,"");
    if(r.actions)lines.push("### 次の行動",r.actions,"");
    if(r.tags?.length)lines.push("### タグ",r.tags.map(t=>`#${t}`).join(" "), "");
  });
  download("memory-core-export.md",lines.join("\n"),"text/markdown");
};
$("clearBtn").onclick=()=>{if(confirm("すべての記録を削除します。事前にJSONバックアップを取ることをおすすめします。続けますか？")){records=[];persist()}};
render();
