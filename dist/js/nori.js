import {noriSnapshot,nextLetter,builtinHelp,refreshNoriStorage} from './nori-context.js';

const KEY='novi.nori.v1';
const intro='Hi, I’m Nori, your little guide to small signs and steady progress. Want help with this letter, or choosing your next step?';
let storageOK=true;
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{storageOK=false;return {};}}
const saved=load();
let messages=(Array.isArray(saved.messages)?saved.messages:[]).filter(m=>m&&['user','assistant','builtin'].includes(m.kind)&&typeof m.text==='string').slice(-24).map(m=>({kind:m.kind,text:m.text.slice(0,4000),complete:m.complete!==false,actionKind:['guide','letter','next','camera','progress'].includes(m.actionKind)?m.actionKind:null,actionLetter:typeof m.actionLetter==='string'&&/^[A-Z]$/.test(m.actionLetter)?m.actionLetter:null}));
let tips=saved.tips!==false,seen=saved.seen===true,controller=null,retryPending=false,lastFocus=null,tipTimer,slowTimer;
function persist(){try{localStorage.setItem(KEY,JSON.stringify({messages:messages.slice(-24),tips,seen}));}catch{storageOK=false;}}
const root=document.createElement('div');root.className='nori';root.dataset.expression='idle';
const mascot='<svg class="nori-mascot" viewBox="0 0 100 100" aria-hidden="true"><use href="assets/nori.svg#nori-firefly"></use></svg>';
// This template is static. All user/model/context text is rendered with textContent.
root.innerHTML=`<button class="nori-launcher" aria-label="Open Nori learning companion" aria-haspopup="dialog" aria-expanded="false">${mascot}<span>Ask Nori</span></button>
<aside class="nori-tip" hidden><p></p><button class="nori-dismiss" aria-label="Dismiss Nori’s tip">×</button><button class="nori-tip-open">Learn with Nori →</button></aside>
<dialog class="nori-panel" aria-labelledby="nori-title" aria-describedby="nori-description">
 <header class="nori-head">${mascot}<div><h2 id="nori-title">A little help from Nori</h2><p>Your fingerspelling companion</p></div><button class="nori-close" aria-label="Close Nori">×</button></header>
 <div class="nori-context"></div>
 <div class="nori-thread" role="region" aria-label="Conversation with Nori" tabindex="0"></div>
 <div class="nori-prompts"><button data-prompt="letter">Explain this letter</button><button data-prompt="next">What should I practice next?</button><button data-prompt="camera">Help with my camera</button><button data-prompt="progress">Show my progress</button></div>
 <div class="nori-state" role="status" aria-live="polite" aria-atomic="true"></div>
 <div class="nori-recovery" hidden><button class="nori-retry">Retry message</button></div>
 <form class="nori-compose" novalidate><label class="nori-sr" for="nori-input">Message Nori</label><textarea id="nori-input" rows="2" maxlength="1200" placeholder="One small question…" required></textarea><button class="nori-send" type="submit">Send</button></form>
 <footer class="nori-foot"><p id="nori-description">Local AI can make mistakes. Nori cannot see your hand. Its movements are decorative, not ASL signs.</p><details><summary>Built-in help & settings</summary><div class="nori-settings"><div class="nori-help"><button data-help="guide">Site guide</button><button data-help="letter">Letter lesson</button><button data-help="camera">Camera help</button><button data-help="progress">Progress</button></div><label><input type="checkbox" class="nori-tips">Occasional guidance tips</label><button class="nori-delete">Delete conversation</button><p class="nori-storage"></p></div></details></footer>
</dialog>`;
document.body.append(root);
const $=s=>root.querySelector(s),panel=$('.nori-panel'),thread=$('.nori-thread'),input=$('textarea'),send=$('.nori-send'),status=$('.nori-state');
// Dock around actual control bounds, including when the page is scrolled.
let dockFrame=0;
function dock(){
  cancelAnimationFrame(dockFrame);dockFrame=requestAnimationFrame(()=>{
    const launcher=$('.nori-launcher'),gap=innerWidth<=600?12:22,w=launcher.offsetWidth,h=launcher.offsetHeight;
    const controls=[...document.querySelectorAll('#start-camera,#stop-camera,#flip-camera,#next-letter,#previous-letter,#word-form button,#mark-studied,#quiz-options button')].filter(el=>!el.hidden).map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height);
    const overlaps=(x,y)=>controls.filter(r=>x<r.right+8&&x+w>r.left-8&&y<r.bottom+8&&y+h>r.top-8);
    const right=innerWidth-gap-w,y=innerHeight-gap-h;
    const left=overlaps(right,y).length>0&&overlaps(gap,y).length===0;
    root.classList.toggle('nori-dock-left',left);
    let lift=0;
    if(!left)for(let i=0;i<controls.length;i++){const hits=overlaps(right,y-lift);if(!hits.length)break;lift=Math.max(lift,...hits.map(r=>y-r.top+h+10));}
    root.style.setProperty('--nori-lift',`${Math.max(0,Math.min(lift,innerHeight-h-gap))}px`);
  });
}
window.addEventListener('scroll',dock,{passive:true});window.addEventListener('resize',dock);
$('.nori-tips').checked=tips;
function storageNote(){$('.nori-storage').textContent=storageOK?'Saved chat stays in this browser. Messages, lesson and progress summaries go through the Node backend to its configured AI server. Camera frames and landmarks stay local. Deleting chat leaves learning progress unchanged.':'Browser storage is unavailable. Conversation and settings last only for this page session.';}
function contextLabel(){const s=noriSnapshot();$('.nori-context').textContent=`${s.page==='studio'?'Studio':'Alphabet'} · ${s.route} · Letter ${s.selectedLetter} · ${s.progress.combinedStudied}/26 studied`;}
function actions(kind,requestedLetter){
  const s=noriSnapshot(),box=document.createElement('div');box.className='nori-actions';
  // Links are derived exclusively from validated application inputs, never AI output.
  const letter=typeof requestedLetter==='string'&&/^[A-Z]$/.test(requestedLetter)?requestedLetter:/^[A-Z]$/.test(s.selectedLetter)?s.selectedLetter:'A';
  const next=nextLetter(s);
  const links=kind==='progress'?[['View camera progress','dojo.html#progress'],[`Study ${next}`,`index.html?letter=${next}#alphabet`]]:
    kind==='next'?[[`Continue ${letter}`,`index.html?letter=${letter}#alphabet`],[`Study ${next}`,`index.html?letter=${next}#alphabet`],['Word studio','dojo.html#words']]:
    kind==='camera'?[['Open camera practice',`dojo.html?letter=${letter}#learn`]]:
    kind==='letter'?[[`Open ${letter} lesson`,`index.html?letter=${letter}#alphabet`]]:
    [['Alphabet','index.html#alphabet'],['Knowledge check','index.html#review'],['Camera practice',`dojo.html?letter=${letter}#learn`],['Word studio','dojo.html#words']];
  for(const [title,href]of links){const a=document.createElement('a');a.textContent=title;a.href=href;box.append(a);}
  return box;
}
function bubble(m){
  const el=document.createElement('article');el.className='nori-message';el.dataset.kind=m.kind;el.dataset.incomplete=String(m.complete===false);
  const label=document.createElement('small');label.textContent=m.kind==='user'?'You':m.kind==='builtin'?'Built-in guide':m.complete===false?'Nori · local AI · incomplete':'Nori · local AI';
  const p=document.createElement('p');p.textContent=m.text;el.append(label,p);if(m.actionKind)el.append(actions(m.actionKind,m.actionLetter));thread.append(el);return el;
}
function scroll(){thread.scrollTop=thread.scrollHeight;}
function render(){thread.replaceChildren();if(!messages.length)bubble({kind:'builtin',text:intro,complete:true});for(const m of messages)bubble(m);scroll();}
function localHelp(kind){const m={kind:'builtin',text:builtinHelp(kind),complete:true,actionKind:kind,actionLetter:noriSnapshot().selectedLetter};messages.push(m);bubble(m);persist();storageNote();scroll();root.dataset.expression='happy';status.textContent='Built-in help shown. No model request was made.';}
function dismissTip(){clearTimeout(tipTimer);$('.nori-tip').hidden=true;seen=true;persist();}
function open(){lastFocus=document.activeElement;dismissTip();if(!panel.open)panel.showModal();$('.nori-launcher').setAttribute('aria-expanded','true');root.dataset.expression=controller?'thinking':'idle';contextLabel();storageNote();input.focus();}
function close(){cancel();panel.close();$('.nori-launcher').setAttribute('aria-expanded','false');root.dataset.expression='resting';if(lastFocus?.isConnected)lastFocus.focus();else $('.nori-launcher').focus();}
function cancel(){if(controller)controller.abort();}
$('.nori-launcher').addEventListener('click',open);$('.nori-close').addEventListener('click',close);
panel.addEventListener('cancel',e=>{e.preventDefault();close();});
panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
$('.nori-dismiss').addEventListener('click',dismissTip);$('.nori-tip-open').addEventListener('click',open);
$('.nori-tips').addEventListener('change',e=>{tips=e.target.checked;if(!tips)dismissTip();persist();storageNote();});
root.querySelectorAll('[data-help]').forEach(b=>b.addEventListener('click',()=>localHelp(b.dataset.help)));
let deleteArmed=false;
$('.nori-delete').addEventListener('click',e=>{
  if(!deleteArmed){deleteArmed=true;e.target.textContent='Confirm delete conversation';return;}
  cancel();messages=[];persist();render();storageNote();status.textContent='Conversation deleted. Learning progress is unchanged.';retryPending=false;$('.nori-recovery').hidden=true;deleteArmed=false;e.target.textContent='Delete conversation';
});
root.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{
  if(controller)return;const kind=b.dataset.prompt;
  // Show recorded progress deterministically; the model never calculates or awards it.
  if(kind==='progress'){localHelp(kind);return;}
  input.value=kind==='letter'?`Explain letter ${noriSnapshot().selectedLetter}.`:b.textContent;submit();
}));
$('.nori-retry').addEventListener('click',()=>{if(retryPending&&!controller)submit(true);});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!controller)submit();}});
$('.nori-compose').addEventListener('submit',e=>{e.preventDefault();if(controller)cancel();else submit();});

async function submit(retry=false){
  if(controller)return;
  if(!retry){const text=input.value.trim();if(!text)return;const m={kind:'user',text:text.slice(0,1200),complete:true};messages.push(m);bubble(m);input.value='';}
  else if(messages.at(-1)?.kind==='assistant'&&messages.at(-1).complete===false){messages.pop();render();}
  const requestMessages=messages.filter(m=>(m.kind==='user'||m.kind==='assistant')&&m.complete!==false).slice(-8).map(m=>({role:m.kind==='user'?'user':'assistant',content:m.text.slice(0,1200)}));
  if(!requestMessages.length||requestMessages.at(-1).role!=='user')return;
  const snapshot=noriSnapshot();
  const aborter=new AbortController();controller=aborter;retryPending=false;$('.nori-recovery').hidden=true;
  send.textContent='Stop';send.classList.add('nori-stopping');input.readOnly=true;root.querySelectorAll('[data-prompt]').forEach(b=>b.disabled=true);root.dataset.expression='thinking';
  status.textContent='Connecting to local Magnitude… First load can take a few minutes.';
  slowTimer=setTimeout(()=>{if(controller===aborter)status.textContent='Still waiting for Magnitude. The model may be loading; you can stop and use built-in help.';},15000);
  let answer=null,el=null,finished=false;
  const onEvent=event=>{
    if(event.type==='error')throw new Error(event.message||'Magnitude could not finish the response.');
    if(event.type==='delta'&&typeof event.text==='string'){
      clearTimeout(slowTimer);
      if(!answer){answer={kind:'assistant',text:'',complete:false};messages.push(answer);el=bubble(answer);status.textContent='Nori is replying…';}
      if(answer.text.length+event.text.length>12000)throw new Error('Reply reached its size limit. Try a shorter question.');
      const atBottom=thread.scrollHeight-thread.scrollTop-thread.clientHeight<80;
      answer.text+=event.text;el.querySelector('p').textContent=answer.text;if(atBottom)scroll();
    }
    if(event.type==='done'){if(!answer?.text)throw new Error('Magnitude returned no answer text. Try again or use built-in help.');finished=true;answer.complete=true;el.dataset.incomplete='false';el.querySelector('small').textContent='Nori · local AI';const question=requestMessages.at(-1).content;answer.actionKind=/progress/i.test(question)?'progress':/next/i.test(question)?'next':/camera/i.test(question)?'camera':/letter/i.test(question)?'letter':'guide';answer.actionLetter=question.match(/(?:letter|sign for|sign)\s+([a-z])\b/i)?.[1]?.toUpperCase()||snapshot.selectedLetter;el.append(actions(answer.actionKind,answer.actionLetter));}
  };
  try{
    const response=await fetch('/api/nori/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:requestMessages,context:snapshot}),signal:aborter.signal});
    if(!response.ok){let detail;try{detail=(await response.json()).error;}catch{}throw new Error(detail||(response.status===404||response.status===405?'AI chat requires the Novi Node backend. Built-in help is available below.':`Local AI connection failed (${response.status}).`));}
    if(!response.headers.get('content-type')?.includes('application/x-ndjson'))throw new Error('This host is serving static files. Start the Novi Node backend for AI chat.');
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    while(true){const {done,value}=await reader.read();buffer+=decoder.decode(value||new Uint8Array(),{stream:!done});const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines)if(line.trim())onEvent(JSON.parse(line));if(done)break;}
    if(buffer.trim())onEvent(JSON.parse(buffer));
    if(!finished)throw new Error('Magnitude disconnected before finishing. You can retry.');
    status.textContent='Reply complete. Check signs against the lesson reference.';root.dataset.expression='happy';
  }catch(error){
    if(answer){answer.complete=false;el.dataset.incomplete='true';el.querySelector('small').textContent='Nori · local AI · incomplete';}
    // A deletion may have removed this request’s messages while it was stopping.
    if(messages.length){retryPending=true;$('.nori-recovery').hidden=false;status.textContent=aborter.signal.aborted?'Reply stopped. Any partial text is marked incomplete.':`${error.message} Use Built-in help & settings for lesson and navigation help.`;root.dataset.expression='resting';}
  }finally{
    clearTimeout(slowTimer);controller=null;send.textContent='Send';send.classList.remove('nori-stopping');input.readOnly=false;root.querySelectorAll('[data-prompt]').forEach(b=>b.disabled=false);persist();storageNote();
  }
}
function tip(text){if(!tips||panel.open||controller||!$('.nori-tip').hidden)return;$('.nori-tip p').textContent=text;$('.nori-tip').hidden=false;tipTimer=setTimeout(()=>{$('.nori-tip').hidden=true;},18000);}
window.addEventListener('novi:word-complete',e=>{if(/^[A-IK-Y]{1,16}$/.test(e.detail?.word||''))tip(`You completed ${e.detail.word}. Want to review your progress or choose another word?`);});
window.addEventListener('novi:context',()=>{contextLabel();dock();});
window.addEventListener('storage',e=>{if(!e.key||['novi.academy.v1','signly.academy.v1','signly.progress.v1'].includes(e.key)){refreshNoriStorage();contextLabel();}});
window.addEventListener('pagehide',()=>{cancel();persist();});
render();contextLabel();storageNote();dock();
if(!seen){seen=true;persist();setTimeout(()=>tip('Small signs, steady progress. I’m Nori — open me whenever you’d like a little help.'),3500);}
