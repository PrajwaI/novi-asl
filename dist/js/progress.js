import {STATIC_LETTERS} from './lessons.js';
export const PROGRESS_KEY='signly.progress.v1';
const validLetter=letter=>STATIC_LETTERS.includes(letter);
const count=value=>Number.isSafeInteger(value)&&value>=0?value:0;
function validDay(day){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const date=new Date(`${day}T12:00:00Z`);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;
}
export function freshProgress() {return {completed:[],correct:0,attempts:0,days:[],daily:{},history:[]};}
function normalizeProgress(p){
 if(!p||typeof p!=='object'||Array.isArray(p))return freshProgress();
 const completed=[...new Set((Array.isArray(p.completed)?p.completed:[]).filter(validLetter))];
 const daily=Object.fromEntries(Object.entries(p.daily&&typeof p.daily==='object'&&!Array.isArray(p.daily)?p.daily:{})
  .filter(([day,value])=>validDay(day)&&count(value)>0));
 const days=[...new Set([...(Array.isArray(p.days)?p.days:[]).filter(validDay),...Object.keys(daily)])].sort();
 const history=(Array.isArray(p.history)?p.history:[]).filter(item=>item&&validLetter(item.letter)&&typeof item.correct==='boolean'&&typeof item.at==='string'&&Number.isFinite(Date.parse(item.at)))
  .slice(-300).map(({letter,correct,at})=>({letter,correct,at}));
 const correct=count(p.correct),attempts=Math.max(correct,count(p.attempts));
 return {completed,correct,attempts,days,daily,history};
}
export function readProgress(storage) {
 try {storage??=globalThis.localStorage;return normalizeProgress(JSON.parse(storage.getItem(PROGRESS_KEY)));}catch{return freshProgress();}
}
export function dayKey(date=new Date()) {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function recordAttempt(p,letter,correct,date=new Date()) {
 if(!validLetter(letter)||typeof correct!=='boolean'||!Number.isFinite(date.getTime()))return p;
 const day=dayKey(date); p.attempts++; if(correct){p.correct++;if(!p.completed.includes(letter))p.completed.push(letter);if(!p.days.includes(day))p.days.push(day);p.daily[day]=(p.daily[day]||0)+1;}
 p.history.push({letter,correct,at:date.toISOString()}); p.history=p.history.slice(-300); return p;
}
export function saveProgress(p,storage) {try{storage??=globalThis.localStorage;storage.setItem(PROGRESS_KEY,JSON.stringify(normalizeProgress(p)));return true;}catch{return false;}}
export function streak(p,date=new Date()) {const d=new Date(date);if(!Number.isFinite(d.getTime()))return 0;const days=new Set(p.days);d.setHours(12,0,0,0);if(!days.has(dayKey(d)))d.setDate(d.getDate()-1);let count=0;while(days.has(dayKey(d))){count++;d.setDate(d.getDate()-1);}return count;}
