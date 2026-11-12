import {ALPHABET} from './lessons.js';
export const ACADEMY_KEY='novi.academy.v1';
export const LEGACY_ACADEMY_KEY='signly.academy.v1';
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function readAcademy(storage){
  try{
    storage??=globalThis.localStorage;
    const p=JSON.parse(storage.getItem(ACADEMY_KEY)||storage.getItem(LEGACY_ACADEMY_KEY)||'{}')||{};
    return {
      selected:ALPHABET.includes(p.selected)?p.selected:'A',
      studied:[...new Set((Array.isArray(p.studied)?p.studied:[]).filter(l=>ALPHABET.includes(l)))],
      quizCorrect:count(p.quizCorrect),
      // New tracking starts here; historical quizCorrect has no denominator.
      quizAttempts:count(p.quizAttempts),
      trackedQuizCorrect:Math.min(count(p.quizAttempts),count(p.trackedQuizCorrect)),
      quizHistory:(Array.isArray(p.quizHistory)?p.quizHistory:[]).filter(h=>h&&ALPHABET.includes(h.letter)&&typeof h.correct==='boolean'&&Number.isFinite(Date.parse(h.at))).slice(-100)
    };
  }catch{return {selected:'A',studied:[],quizCorrect:0,quizAttempts:0,trackedQuizCorrect:0,quizHistory:[]};}
}
export function saveAcademy(state){try{localStorage.setItem(ACADEMY_KEY,JSON.stringify(state));return true;}catch{return false;}}
