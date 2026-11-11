import {icon} from './icons.js';
import {ALPHABET,LESSONS,STATIC_LETTERS,WORDS} from './lessons.js';
import {readProgress,saveProgress,recordAttempt,dayKey,freshProgress,PROGRESS_KEY} from './progress.js';
import {RecognitionGate,FailureGate,rankCategories,handQuality,positioningFeedback} from './recognition.js';
import {SignCamera} from './camera.js';
const $=id=>document.getElementById(id);
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const state={route:'learn',letter:'A',filter:'all',progress:readProgress(),credited:false,word:'HELLO',wordIndex:0,wordDone:false,practiceCorrect:0,release:false,releaseSince:null,attemptSince:null,mirrored:false,autoTimer:null};
const gate=new RecognitionGate();
const failureGate=new FailureGate();
function toast(message){$('toast').textContent=message;$('toast').hidden=false;window.clearTimeout(state.toastTimer);state.toastTimer=window.setTimeout(()=>$('toast').hidden=true,4200);}
function feedback(title,text,kind='neutral'){if($('feedback-title').textContent!==title)$('feedback-title').textContent=title;if($('feedback-text').textContent!==text)$('feedback-text').textContent=text;const success=kind==='success';document.querySelector('.feedback-panel').classList.toggle('success',success);$('feedback-symbol').innerHTML=icon(success?'check':kind==='warning'?'info':'hand');}
function confidence(score=null){const value=score===null?null:Math.round(score*100);$('confidence-value').textContent=value===null?'—':`${value}%`;$('confidence-bar').style.width=`${value||0}%`;document.querySelector('.confidence-track').setAttribute('aria-valuenow',String(value||0));document.querySelector('.confidence-track').classList.toggle('success',score>=.90);}
const camera=new SignCamera({video:$('webcam'),canvas:$('landmarks'),onResult:handleResult,onState:cameraState});
function cameraState(status,message){
 const active=status==='active',loading=status==='loading';$('camera-stage').classList.toggle('live',active);$('camera-placeholder').hidden=active||loading;$('loading-overlay').hidden=!loading;$('start-camera').disabled=loading;$('stop-camera').hidden=!active&&!loading;$('flip-camera').hidden=!active;$('hand-guide').hidden=!active;
 $('camera-status').innerHTML=`<i></i>${active?'Camera on':loading?'Preparing…':'Camera off'}`;$('camera-status').classList.toggle('on',active);
 if(loading){$('loading-label').textContent=message;feedback('Getting your space ready',message);}
 if(active){gate.reset();failureGate.reset();state.attemptSince=null;if(state.credited)completedFeedback();else feedback('Show us your hand','Bring one hand into view. Keep your whole hand and wrist inside the frame.');}
 if(status==='off'){gate.reset();failureGate.reset();state.release=false;state.attemptSince=null;confidence();$('tracking-label').textContent='21-point hand tracking';feedback('Ready when you are','Enable your camera to get real-time feedback on your sign.');}
 if(status==='error'){feedback('Let’s get you connected',message,'warning');toast(message);}
}
function completedFeedback(){
 if(state.route==='words'&&state.wordDone)feedback('Word complete!',`You spelled ${state.word}. Choose another word to keep going.`,'success');
 else feedback('Correct!',state.route==='learn'?`You completed letter ${state.letter}. Choose Next letter to keep learning.`:'Sign complete. Continue when you are ready.','success');
}
function handleResult(result,now){
 if($('info-dialog').open){gate.reset();failureGate.reset();state.attemptSince=null;state.releaseSince=null;return;}
 const hands=result.landmarks||[],lm=hands[0],categories=result.gestures?.[0]||[];const lesson=LESSONS[state.letter];
 $('tracking-label').textContent=hands.length===1?'21 landmarks tracked':hands.length>1?'Show one hand only':'Looking for your hand';$('hand-guide').hidden=hands.length>0;
 if(state.release){confidence();gate.reset();const prior=rankCategories(categories)[0];const released=hands.length===0||(hands.length===1&&handQuality(lm)&&prior&&prior.categoryName!==state.previousLetter&&prior.score>.65);if(released){state.releaseSince??=now;if(now-state.releaseSince>350){state.release=false;state.releaseSince=null;}}else state.releaseSince=null;if(state.release){feedback('A little reset','Lower your hand briefly, then sign the next letter. This separates repeated letters.');return;}}
 if(state.credited){completedFeedback();return;}
 if(!lesson.supported){confidence();gate.reset();feedback('A sign in motion','Follow the movement guide. Automatic checking for J and Z needs a validated motion model.');return;}
 const decision=gate.update({target:state.letter,categories,handCount:hands.length,quality:handQuality(lm),now});
 const failed=failureGate.update({target:state.letter,decision,handCount:hands.length,quality:handQuality(lm),now});
 confidence(hands.length===1?decision.score:null);
 if(hands.length===0){state.attemptSince=null;feedback('Your hand is out of view','Bring one hand into the frame, with your whole wrist visible.');return;}
 if(hands.length>1){state.attemptSince=null;feedback('One hand is all you need','ASL alphabet signs use one hand. Move your other hand out of the frame.');return;}
 if(!handQuality(lm)){state.attemptSince=null;feedback('A little more room',positioningFeedback(lm,state.letter));return;}
 if(decision.match){state.attemptSince=null;feedback('That’s looking good!',`Hold your ${state.letter} steady… ${Math.min(100,Math.round(decision.hold*100))}%`);if(decision.correct)onCorrect();return;}
 state.attemptSince??=now;
 if(now-state.attemptSince<700){feedback('Finding your sign…','Keep your hand steady while the model checks your handshape.');return;}
 const knownWrong=decision.topScore>=.90&&decision.margin>=.25&&decision.top!==state.letter&&decision.top?.toLowerCase()!=='none';
 if(knownWrong){feedback('Try Again',`The model sees ${/^[A-Z]$/.test(decision.top)?`letter ${decision.top}`:'a different sign'}. ${positioningFeedback(lm,state.letter)}`,'warning');if(failed){recordAttempt(state.progress,state.letter,false);save();}}
 else feedback('Not quite sure yet',positioningFeedback(lm,state.letter));
}
function save(){if(!saveProgress(state.progress)&&!state.storageWarned){toast('Browser storage is unavailable. Progress will last for this session.');state.storageWarned=true;}renderStats();}
function onCorrect(){
 if(state.credited)return;state.credited=true;recordAttempt(state.progress,state.letter,true);save();feedback('Correct!',`Beautifully signed. You’ve got the letter ${state.letter}.`,'success');renderAlphabet();$('lesson-completed').hidden=false;
 if(state.route==='practice'){
  state.autoTimer=window.setTimeout(()=>{state.previousLetter=state.letter;state.release=true;state.releaseSince=null;selectLetter(randomLetter(),{keepRelease:true});},1300);
 }else if(state.route==='words'){
  state.wordIndex++;renderWord();if(state.wordIndex>=state.word.length){state.wordDone=true;feedback('Word complete!',`You spelled ${state.word}. Choose another word to keep going.`,'success');toast(`A word well signed: ${state.word}!`);}else state.autoTimer=window.setTimeout(()=>{state.previousLetter=state.letter;state.release=true;state.releaseSince=null;selectLetter(state.word[state.wordIndex],{keepRelease:true});renderWord();},1300);
 }else{$('next-letter').innerHTML=`Keep learning ${icon('arrow')}`;}
}
function selectLetter(letter,{keepRelease=false}={}){
 window.clearTimeout(state.autoTimer);state.letter=letter;state.credited=false;state.attemptSince=null;gate.reset();failureGate.reset();if(!keepRelease){state.release=false;state.releaseSince=null;}
 const lesson=LESSONS[letter],index=ALPHABET.indexOf(letter);$('lesson-number').textContent=`LETTER ${String(index+1).padStart(2,'0')} / 26`;$('lesson-type').textContent=lesson.dynamic?'Movement sign':'Static sign';$('letter-watermark').textContent=letter;$('lesson-letter').textContent=letter;$('reference-letter').textContent=letter;$('stage-letter').innerHTML=`SIGN <b>${letter}</b>`;$('lesson-summary').textContent=lesson.title;$('lesson-steps').replaceChildren(...lesson.steps.map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));
 $('sign-reference').src=`assets/signs/${letter}.svg`;$('sign-reference').alt=`ASL letter ${letter}${lesson.dynamic?' movement guide':' handshape'}`;
 $('lesson-tip').textContent=lesson.dynamic?'J and Z are taught here. Live grading is unavailable until a motion model is validated.':'Keep it relaxed. A comfortable hand makes a clearer sign.';
 $('lesson-completed').hidden=!state.progress.completed.includes(letter);$('next-letter').innerHTML=`${state.route==='practice'?'Another letter':state.route==='words'?'Restart word':'Next letter'} ${icon('arrow')}`;
 $('previous-letter').hidden=state.route==='practice';$('previous-letter').disabled=state.route==='words';confidence();
 if(camera.active)feedback('Your next small step',`Show the sign for ${letter} and hold it steady.`);
 else if(camera.status!=='loading')feedback(lesson.supported?'Ready when you are':'A sign in motion',lesson.supported?'Enable your camera to get real-time feedback on your sign.':'Explore this movement lesson. Automatic grading for J and Z is not available.');
 renderAlphabet();
}
function renderAlphabet(){
 $('lesson-completed').hidden=!state.progress.completed.includes(state.letter);
 const letters=ALPHABET.filter(l=>state.filter==='all'||(state.filter==='done'?state.progress.completed.includes(l):!state.progress.completed.includes(l)));
 $('alphabet-grid').innerHTML=letters.map(l=>`<button class="letter-tile ${state.letter===l?'current':''} ${state.progress.completed.includes(l)?'done':''}" data-letter="${l}" aria-label="Learn letter ${l}${LESSONS[l].dynamic?', movement lesson only':''}${state.progress.completed.includes(l)?', learned':''}" aria-pressed="${state.letter===l}"><img src="assets/signs/${l}.svg" alt="" loading="lazy" width="33" height="47"><b>${l}</b>${state.progress.completed.includes(l)?`<span class="tile-check">${icon('check')}</span>`:LESSONS[l].dynamic?'<span class="tile-motion">↝</span>':''}</button>`).join('');$('alphabet-empty').hidden=letters.length>0;$('alphabet-count').textContent=`${state.progress.completed.length} / 26`;
}
function renderStats(){
 const p=state.progress,today=p.daily[dayKey()]||0;$('daily-count').textContent=`${Math.min(5,today)} of 5`;$('daily-bar').style.width=`${Math.min(100,today/5*100)}%`;
 if(state.route!=='progress')return;
 const stats=[['Letters studied',`${p.completed.length}<small> / 26</small>`,'Your saved learning progress in this browser.']];
 $('stat-grid').innerHTML=stats.map(([label,value,desc])=>`<article class="stat-card"><span>${label}</span><b>${value}</b><p>${desc}</p></article>`).join('');$('progress-letters').innerHTML=ALPHABET.map(l=>`<span class="${p.completed.includes(l)?'done':''}" title="${l}: ${p.completed.includes(l)?'learned':LESSONS[l].dynamic?'movement lesson only':'to learn'}">${l}</span>`).join('');$('progress-explanation').textContent=`${Math.round(p.completed.length/26*100)}% of the alphabet learned. J and Z are available as lessons; movement grading is not enabled. Uncertain frames are not scored as failed attempts.`;
 const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return {label:d.toLocaleDateString(undefined,{weekday:'short'}),count:p.daily[dayKey(d)]||0};});const max=Math.max(5,...days.map(d=>d.count));$('week-chart').innerHTML=days.map(d=>`<div class="week-day"><b>${d.count}</b><i style="height:${Math.max(3,d.count/max*95)}px" aria-label="${d.label}: ${d.count} correct signs"></i><span>${d.label}</span></div>`).join('');
}
function randomLetter(){const pool=STATIC_LETTERS.filter(l=>l!==state.letter);const number=crypto.getRandomValues(new Uint32Array(1))[0];return pool[number%pool.length];}
function renderWord(){$('word-tiles').innerHTML=[...state.word].map((l,i)=>`<span class="${i<state.wordIndex?'done':i===state.wordIndex?'current':''}" aria-label="${l}, ${i<state.wordIndex?'complete':i===state.wordIndex?'current':'up next'}">${l}</span>`).join('');}
function startWord(raw){const word=raw.trim().toUpperCase();if(!/^[A-Z]{1,16}$/.test(word)){$('word-error').textContent='Use 1–16 letters, without spaces or punctuation.';$('word-error').classList.add('error-text');return;}if(/[JZ]/.test(word)){$('word-error').textContent='J and Z need motion grading. Try a word with static letters, like HELLO.';$('word-error').classList.add('error-text');return;}$('word-error').classList.remove('error-text');$('word-error').textContent='Lower your hand between letters, including repeated letters.';state.word=word;state.wordIndex=0;state.wordDone=false;$('word-input').value=word;selectLetter(word[0]);renderWord();}
function setRoute(){
 const route=location.hash.slice(1);state.route=['learn','practice','words','progress'].includes(route)?route:'learn';window.clearTimeout(state.autoTimer);state.release=false;gate.reset();failureGate.reset();state.credited=false;
 document.querySelectorAll('[data-route]').forEach(a=>{const active=a.dataset.route===state.route;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 const progress=state.route==='progress';$('welcome').hidden=false;$('workspace-view').hidden=progress;$('progress-view').hidden=!progress;$('word-controls').hidden=state.route!=='words';$('practice-strip').hidden=state.route!=='practice';
 const copy={learn:['Your hands. <span>A whole new language.</span>','Learn the ASL alphabet at your own pace. Let’s make your first sign.','Let’s learn the alphabet','BEGINNER FRIENDLY'],practice:['Guided <span>practice.</span>','Practice one letter at a time with private camera feedback and no time pressure.','Choose a letter to practice','SELF-PACED PRACTICE'],words:['Letter by letter. <span>Something to say.</span>','Turn the signs you know into words. Take your time with each letter.','Welcome to the word studio','FINGERSPELLING'],progress:['Look at you. <span>Making connections.</span>','A record of your small steps and the signs you’re making your own.','','']};
 const [title,desc,heading,badge]=copy[state.route];$('page-title').innerHTML=title;$('page-description').textContent=desc;$('workspace-title').textContent=heading;$('mode-badge').textContent=badge;
 if(progress){camera.stop();renderStats();}else if(state.route==='practice'){selectLetter(randomLetter());}else if(state.route==='words')startWord(state.word);else selectLetter(state.letter);
 renderStats();
}
const helpContent=`<h2>Your first sign starts here.</h2><p>Choose a letter, follow the hand illustration, then enable your camera. Use one hand, face a light source, and leave a little space around your fingertips.</p><h3>Hold, then reflect</h3><p>Hold your sign still for one second. A recognized sign requires at least a 90% model score and a clear lead over other predictions. If the model is uncertain, adjust your hand and try again.</p><h3>Learn at your own pace</h3><ul><li><b>Learn:</b> explore all 26 letter lessons.</li><li><b>Practice:</b> receive camera feedback on one static letter at a time.</li><li><b>Word studio:</b> spell a word one letter at a time. Lower your hand briefly between letters.</li><li><b>My progress:</b> revisit the letters you have studied.</li></ul><p>J and Z include movement guides but are not graded. This is an experimental learning aid; model confidence is not a guarantee of correct ASL.</p>`;
const modelContent=`<h2>Real tracking. Honest feedback.</h2><p>Novi ASL uses MediaPipe to track 21 landmarks per hand and a separate, trained ASL gesture classifier. The bundled static model contains labels for 24 static alphabet letters and other gestures.</p><h3>When does a sign count?</h3><p>One fully visible hand, at least a 90% model score, a 25-point lead over the next prediction, and a steady one-second hold across at least eight frames. Uncertain predictions never award progress.</p><p>The percentage is a model score, not measured real-world accuracy. Finger-position hints use landmark geometry; they are suggestions rather than expert assessment.</p><h3>J and Z need more than a handshape</h3><p>Automatic grading is disabled for both. A validated motion model, trained on labeled J/Z video sequences from diverse signers and evaluated on separate signers, is needed before enabling it.</p><p>This community model has no verified multi-signer webcam benchmark. Lighting, hand orientation, occlusion and left/right hands can change results. A Deaf ASL educator should review the teaching and model before classroom use.</p><p><a href="https://github.com/fah-04/SL-recognition" target="_blank" rel="noopener noreferrer">Model source and training notebook ↗</a> · <a href="https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer" target="_blank" rel="noopener noreferrer">MediaPipe documentation ↗</a></p><p>Hand illustrations use the freely distributed Gallaudet teaching font by David Rakowski, provided by <a href="https://www.lifeprint.com/asl101/pages-layout/gallaudettruetypefont.htm" target="_blank" rel="noopener noreferrer">ASL University ↗</a>.</p>`;
function showDialog(content){$('dialog-content').innerHTML=content;$('info-dialog').showModal();}
['help-button','how-button'].forEach(id=>$(id).addEventListener('click',()=>showDialog(helpContent)));
['model-button','recognition-details'].forEach(id=>$(id).addEventListener('click',()=>showDialog(modelContent)));
$('privacy-button').addEventListener('click',()=>showDialog(`<h2>Your camera stays yours.</h2><p>All camera frames, hand tracking and sign classification run locally in your browser. Novi ASL does not upload or record webcam footage, photos, or hand landmarks.</p><p>Your letter completions, practice attempts and study dates are saved in this browser’s local storage. They are not synced to an account. You can clear them in My progress.</p><p>The site downloads its model, illustrations and runtime from this site when needed. Camera access begins only after you choose Enable camera. Use the pause button to turn it off; leaving the tab also stops it.</p>`));
['close-dialog','dialog-done'].forEach(id=>$(id).addEventListener('click',()=>$('info-dialog').close()));$('info-dialog').addEventListener('click',e=>{if(e.target===$('info-dialog')){const r=$('info-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('info-dialog').close();}});
$('start-camera').addEventListener('click',()=>camera.start());$('stop-camera').addEventListener('click',()=>camera.stop());$('flip-camera').addEventListener('click',()=>camera.flip());
$('next-letter').addEventListener('click',()=>{if(state.route==='words'){startWord(state.word);return;}selectLetter(state.route==='practice'?randomLetter():ALPHABET[(ALPHABET.indexOf(state.letter)+1)%26]);});
$('previous-letter').addEventListener('click',()=>selectLetter(ALPHABET[(ALPHABET.indexOf(state.letter)+25)%26]));
$('skip-letter').addEventListener('click',()=>selectLetter(randomLetter()));$('mirror-reference').addEventListener('click',()=>{state.mirrored=!state.mirrored;$('sign-reference').classList.toggle('mirrored',state.mirrored);$('mirror-reference').setAttribute('aria-pressed',String(state.mirrored));});
$('alphabet-grid').addEventListener('click',e=>{const tile=e.target.closest('[data-letter]');if(!tile)return;if(state.route!=='learn'){location.hash='learn';state.letter=tile.dataset.letter;}else selectLetter(tile.dataset.letter);});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b));});renderAlphabet();}));
$('word-form').addEventListener('submit',e=>{e.preventDefault();startWord($('word-input').value);});$('word-choices').innerHTML=WORDS.slice(0,6).map(w=>`<button data-word="${w}">${w}</button>`).join('');$('word-choices').addEventListener('click',e=>{if(e.target.dataset.word)startWord(e.target.dataset.word);});
$('continue-learning').addEventListener('click',()=>location.hash='learn');$('reset-progress').addEventListener('click',()=>showDialog(`<h2>A fresh beginning?</h2><p>This clears learned letters, practice attempts and study dates in this browser.</p><button id="confirm-reset" class="button">Clear my progress</button>`));$('dialog-content').addEventListener('click',e=>{if(e.target.id==='confirm-reset'){state.progress=freshProgress();save();renderAlphabet();$('info-dialog').close();toast('Your progress has been reset. A fresh start awaits.');}});
window.addEventListener('hashchange',setRoute);window.addEventListener('pagehide',event=>{if(event.persisted)camera.stop();else camera.destroy();});document.addEventListener('visibilitychange',()=>{if(document.hidden)camera.stop();else renderStats();});window.addEventListener('storage',e=>{if(e.key===PROGRESS_KEY||e.key===null){state.progress=readProgress();renderStats();renderAlphabet();}});
setRoute();
