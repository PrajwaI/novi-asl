import {ALPHABET,LESSONS} from './lessons.js';
import {readAcademy} from './academy.js';
import {readProgress,dayKey} from './progress.js';

// Only these explicit, text-only fields cross the companion boundary.
// Never pass application state, recognizer results, images or landmarks wholesale.
let academy=readAcademy(),progress=readProgress();
const state={page:typeof location!=='undefined'&&location.pathname.endsWith('dojo.html')?'studio':'home',route:'alphabet',letter:null,word:null,camera:{status:'off',feedback:''}};
let lastNotice=0;
export function updateNoriContext(update={},announce=true){
  if(update.academy)academy=update.academy;
  if(update.progress)progress=update.progress;
  for(const key of ['page','route','letter','word','camera'])if(key in update)state[key]=update[key];
  // Camera feedback may change each frame; listeners receive at most one update/sec.
  if(announce&&typeof window!=='undefined'&&Date.now()-lastNotice>1000){lastNotice=Date.now();window.dispatchEvent(new Event('novi:context'));}
}
export function refreshNoriStorage(){academy=readAcademy();progress=readProgress();}
export function progressSummary(a=academy,p=progress){
  const manuallyStudied=[...new Set(a.studied.filter(l=>ALPHABET.includes(l)))];
  const cameraRecognized=[...new Set(p.completed.filter(l=>ALPHABET.includes(l)&&!'JZ'.includes(l)))];
  return {manuallyStudied,cameraRecognized,combinedStudied:new Set([...manuallyStudied,...cameraRecognized]).size,
    cameraCorrect:p.correct,cameraAttempts:p.attempts,quizCorrectLifetime:a.quizCorrect,
    quizTrackedAttempts:a.quizAttempts,quizTrackedCorrect:a.trackedQuizCorrect,
    todayCameraCorrect:p.daily[dayKey()]||0,activeDays:p.days.length,
    recent:p.history.slice(-4),recentQuiz:a.quizHistory.slice(-3)};
}
export function noriSnapshot(){
  const selectedLetter=ALPHABET.includes(state.letter)?state.letter:academy.selected;
  return {page:state.page,route:state.route,selectedLetter,lesson:LESSONS[selectedLetter],progress:progressSummary(),
    word:state.route==='words'&&state.word?{text:state.word.text,position:state.word.position,complete:Boolean(state.word.complete)}:null,
    camera:{status:state.camera.status,feedback:String(state.camera.feedback||'').slice(0,350)}};
}
export function nextLetter(snapshot=noriSnapshot()){
  const studied=new Set([...snapshot.progress.manuallyStudied,...snapshot.progress.cameraRecognized]);
  return ALPHABET.find(l=>!studied.has(l))||snapshot.selectedLetter;
}
export function progressText(s=noriSnapshot()){
  const p=s.progress;
  return `${p.combinedStudied} of 26 letters studied in total: ${p.manuallyStudied.length} manually studied and ${p.cameraRecognized.length} camera-recognized (overlap counted once). Camera practice: ${p.cameraCorrect} correct out of ${p.cameraAttempts} recorded attempts; uncertain frames are not attempts. Knowledge checks: ${p.quizCorrectLifetime} lifetime correct answers. ${p.quizTrackedAttempts?`${p.quizTrackedCorrect} correct out of ${p.quizTrackedAttempts} answers since detailed tracking began.`:'No quiz accuracy is available for older answers.'}`;
}

export function builtinHelp(kind,s=noriSnapshot()){
  const l=s.lesson;
  if(kind==='letter')return `Letter ${s.selectedLetter}: ${l.title} ${l.steps.join(' ')}${l.dynamic?' J and Z require movement; automatic grading is disabled and word studio excludes them.':''}`;
  if(kind==='progress')return progressText(s);
  if(kind==='camera')return `I cannot see your hand. ${s.camera.feedback?`The practice system says: ${s.camera.feedback} `:''}Use HTTPS or localhost. Choose Enable camera and allow access in your browser’s site settings. If it is busy, close other camera apps; if missing, connect a webcam. Show one whole hand and wrist in good light. Recognition is experimental; uncertain frames do not count as failed attempts. J and Z are lesson-only.`;
  if(kind==='next')return `${progressText(s)} ${s.word?.complete?`You completed ${s.word.text}. Try another word when you’re ready.`:`A possible next step is letter ${nextLetter(s)}. Read its lesson first, then try camera practice if you want.`}`;
  return 'Choose Alphabet to explore a handshape, Knowledge check to identify a sign, or the practice studio for private camera feedback. Word studio practices 1–16 letters and excludes J and Z. ASL is a complete language; fingerspelling is one part of it. Learn with Deaf ASL educators beyond these alphabet lessons.';
}
