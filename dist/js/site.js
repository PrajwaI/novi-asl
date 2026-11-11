import {ALPHABET, LESSONS} from './lessons.js';
import {readProgress} from './progress.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'novi.academy.v1';
const LEGACY_STORAGE_KEY = 'signly.academy.v1';
const letters = ALPHABET;
const letterIndex = letter => letters.indexOf(letter);
function loadSaved(){
  try{
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || '{}');
    return {
      studied:Array.isArray(data.studied) ? [...new Set(data.studied.filter(l=>letters.includes(l)))] : [],
      quizCorrect:Number.isSafeInteger(data.quizCorrect) && data.quizCorrect>=0 ? data.quizCorrect : 0,
      selected:letters.includes(data.selected) ? data.selected : 'A'
    };
  }catch{return {studied:[],quizCorrect:0,selected:'A'};}
}
const state = loadSaved();
let currentQuestion = null;
let questionNumber = 0;
let lastQuestion = null;
function persist(){try{localStorage.setItem(STORAGE_KEY, JSON.stringify(state));}catch{}}
function recognized(){return readProgress().completed.filter(l=>letters.includes(l));}
function studiedLetters(){return new Set([...state.studied,...recognized()]);}
function renderProgress(){
  const n = studiedLetters().size;
  $('nav-progress-count').textContent=n;
  $('explored-fraction').textContent=`${n} / 26`;
  $('progress-bar-fill').style.width=`${n/26*100}%`;
  $('progress-caption').textContent=n === 0 ? 'Your first sign is waiting.' : n === 26 ? 'You explored the full alphabet!' : `${26-n} more letters to explore.`;
}
function renderGrid(){
  const term=$('letter-search').value.toUpperCase().trim();
  const studied=studiedLetters();
  const grid=$('letter-grid');
  const visible=letters.filter(l=>l.includes(term));
  grid.replaceChildren(...visible.map(l=>{
    const b=document.createElement('button');
    b.type='button';b.className='letter-tile';
    if(l===state.selected)b.classList.add('active');
    if(studied.has(l))b.classList.add('studied');
    if(LESSONS[l].dynamic)b.classList.add('motion');
    b.dataset.letter=l;
    b.setAttribute('aria-label',`Letter ${l}${studied.has(l)?', studied':''}${LESSONS[l].dynamic?', movement letter':''}`);
    b.setAttribute('aria-pressed',String(l===state.selected));
    const img=document.createElement('img');img.src=`assets/signs/${l}.svg`;img.alt='';img.loading='lazy';
    const title=document.createElement('strong');title.textContent=l;
    b.append(img,title);
    return b;
  }));
  $('no-letters').hidden=visible.length!==0;
}
function selectLetter(letter,scroll=false){
  if(!letters.includes(letter))return;
  state.selected=letter;persist();renderGrid();
  const lesson=LESSONS[letter];
  $('lesson-index').textContent=`${String(letterIndex(letter)+1).padStart(2,'0')} / 26`;
  $('lesson-letter-bg').textContent=letter;
  $('lesson-sign').src=`assets/signs/${letter}.svg`;
  $('lesson-sign').alt=`ASL fingerspelling handshape for the letter ${letter}`;
  $('active-lesson-title').textContent=`Letter ${letter}`;
  $('lesson-summary').textContent=lesson.title;
  $('lesson-instructions').replaceChildren(...lesson.steps.map(step=>{const li=document.createElement('li');li.textContent=step;return li;}));
  $('lesson-motion').hidden=!lesson.dynamic;
  const fromCamera=recognized().includes(letter);
  const completed=studiedLetters().has(letter);
  $('learned-tag').hidden=!completed;
  $('mark-studied').disabled=fromCamera;
  $('mark-studied').classList.toggle('marked',completed);
  $('mark-studied').innerHTML=fromCamera?'RECOGNIZED IN PRACTICE <span aria-hidden="true">✓</span>':completed?'STUDIED <span aria-hidden="true">✓</span>':'MARK AS STUDIED <span aria-hidden="true">✓</span>';
  $('mark-studied').setAttribute('aria-label',fromCamera?`Letter ${letter} recognized in camera practice`:completed?`Unmark letter ${letter} as studied`:`Mark letter ${letter} as studied`);
  // Webcam recognition is kept even if a user unmarks a letter here.
  if(scroll && matchMedia('(max-width: 860px)').matches) $('active-lesson-title').scrollIntoView({behavior:'smooth',block:'center'});
}
$('letter-grid').addEventListener('click',e=>{
  const tile=e.target.closest('[data-letter]');
  if(tile)selectLetter(tile.dataset.letter,true);
});
$('letter-search').addEventListener('input',renderGrid);
$('mark-studied').addEventListener('click',()=>{
  const l=state.selected;
  const i=state.studied.indexOf(l);
  if(i<0)state.studied.push(l);
  else state.studied.splice(i,1);
  persist();renderProgress();selectLetter(l);
});
$('next-lesson').addEventListener('click',()=>selectLetter(letters[(letterIndex(state.selected)+1)%26]));
$('nav-progress').setAttribute('title','Letters manually marked as studied or recognized in camera practice');

function nextQuestion(){
  const choices=letters.filter(l=>l!==lastQuestion);
  const answer=choices[Math.floor(Math.random()*choices.length)];
  lastQuestion=answer;
  const candidates=letters.filter(l=>l!==answer);
  const distractors=[];
  while(distractors.length<3){
    const l=candidates[Math.floor(Math.random()*candidates.length)];
    if(!distractors.includes(l)) distractors.push(l);
  }
  const options=[answer,...distractors];
  for(let i=options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
  currentQuestion={answer,done:false};questionNumber++;
  $('quiz-round').textContent=`QUESTION ${questionNumber}`;
  $('quiz-image').src=`assets/signs/${answer}.svg`;
  $('quiz-image').alt='ASL fingerspelling handshape to identify';
  $('quiz-options').replaceChildren(...options.map((l,i)=>{
    const button=document.createElement('button');button.className='quiz-option';button.type='button';
    button.dataset.answer=l;button.setAttribute('aria-label',`Option ${i+1}: ${l}`);
    const name=document.createElement('b');name.textContent=l;
    const shortcut=document.createElement('span');shortcut.textContent=`0${i+1}`;
    button.append(name,shortcut);return button;
  }));
  $('quiz-feedback').textContent='Choose a letter to see how you did.';
  $('quiz-feedback').className='quiz-feedback';
  $('quiz-next').hidden=true;
}
$('quiz-options').addEventListener('click',e=>{
  const button=e.target.closest('[data-answer]');
  if(!button||!currentQuestion||currentQuestion.done)return;
  currentQuestion.done=true;
  const correct=button.dataset.answer===currentQuestion.answer;
  for(const option of $('quiz-options').querySelectorAll('button')){
    option.disabled=true;
    if(option.dataset.answer===currentQuestion.answer)option.classList.add('correct');
    else if(option===button)option.classList.add('wrong');
  }
  if(correct){state.quizCorrect++;persist();renderProgress();}
  $('quiz-feedback').classList.add(correct?'good':'bad');
  $('quiz-feedback').textContent=correct?`That's right! ${currentQuestion.answer} is the correct sign.`:`Not quite. That handshape is ${currentQuestion.answer}. ${LESSONS[currentQuestion.answer].title}`;
  $('quiz-next').hidden=false;
});
$('quiz-next').addEventListener('click',nextQuestion);
$('mobile-menu').addEventListener('click',()=>{
  const opened=$('primary-nav').classList.toggle('open');
  $('mobile-menu').setAttribute('aria-expanded',String(opened));
});
$('primary-nav').addEventListener('click',e=>{
  if(e.target.closest('a')){
    $('primary-nav').classList.remove('open');
    $('mobile-menu').setAttribute('aria-expanded','false');
  }
});
window.addEventListener('storage',e=>{
  if(!e.key||e.key===STORAGE_KEY){Object.assign(state,loadSaved());selectLetter(state.selected);}
  if(!e.key||e.key==='signly.progress.v1'){renderGrid();selectLetter(state.selected);}
  renderProgress();
});
renderProgress();selectLetter(state.selected);nextQuestion();
