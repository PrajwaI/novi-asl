export const POLICY={confidence:0.90,margin:0.25,holdMs:1000,minFrames:8};
export function rankCategories(categories=[]){return (Array.isArray(categories)?categories:[])
 .filter(c=>c&&typeof c.categoryName==='string'&&Number.isFinite(c.score)&&c.score>=0&&c.score<=1)
 .sort((a,b)=>b.score-a.score);}
// This gate operates on actual classifier outputs. It never generates predictions.
export class RecognitionGate {
 constructor(policy=POLICY){this.policy=policy;this.reset();}
 reset(){this.since=null;this.frames=0;this.lastAt=null;this.accepted=false;this.target=null;}
 update({target,categories=[],handCount=0,quality=true,now}) {
  const sorted=rankCategories(categories);
  const top=sorted[0];const score=sorted.find(c=>c.categoryName===target)?.score||0;
  const margin=top ? top.score-(sorted[1]?.score||0):0;
  const unsupported=!/^[A-Z]$/.test(target)||'JZ'.includes(target);
  const validTime=Number.isFinite(now)&&(this.lastAt===null||now>this.lastAt);
  if(this.target!==target){this.reset();this.target=target;}
  const match=validTime && !unsupported && handCount===1 && quality && top?.categoryName===target && score>=this.policy.confidence && margin>=this.policy.margin;
  if(!match || (this.lastAt!==null && now-this.lastAt>400)){this.since=null;this.frames=0;this.accepted=false;}
  if(match){if(this.since===null)this.since=now;this.frames++;}
  this.lastAt=Number.isFinite(now)?now:null;
  const hold=match?Math.min(1,(now-this.since)/this.policy.holdMs):0;
  const correct=match&&hold>=1&&this.frames>=this.policy.minFrames&&!this.accepted;
  if(correct)this.accepted=true;
  return {score,top:top?.categoryName,topScore:top?.score||0,margin,hold,correct,match,unsupported};
 }
}
// A failed attempt needs its own continuous, confident observation window.
// Time spent uncertain must never make one transient wrong frame count as a miss.
export class FailureGate {
 constructor(){this.reset();}
 reset(){this.target=null;this.label=null;this.since=null;this.lastAt=null;this.frames=0;this.scored=false;}
 update({target,decision,handCount=0,quality=false,now}){
  if(this.target!==target||handCount===0){this.reset();this.target=target;}
  const validTime=Number.isFinite(now)&&(this.lastAt===null||now>this.lastAt);
  const qualified=validTime&&handCount===1&&quality&&!decision.unsupported&&decision.top&&decision.top!==target&&decision.top.toLowerCase()!=='none'&&decision.topScore>=POLICY.confidence&&decision.margin>=POLICY.margin;
  if(!qualified||this.label!==decision.top||(this.lastAt!==null&&now-this.lastAt>400)){
   this.since=null;this.frames=0;this.label=null;
  }
  if(qualified){this.label=decision.top;this.since??=now;this.frames++;}
  this.lastAt=Number.isFinite(now)?now:null;
  if(qualified&&!this.scored&&now-this.since>=1600&&this.frames>=POLICY.minFrames){this.scored=true;return true;}
  return false;
 }
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function handQuality(lm){if(!Array.isArray(lm)||lm.length!==21||lm.some(p=>!p||![p.x,p.y,p.z].every(Number.isFinite)))return false;return lm.every(p=>p.x>.025&&p.x<.975&&p.y>.025&&p.y<.975)&&dist(lm[0],lm[9])>.09;}
export function positioningFeedback(lm,target){
 if(!lm)return 'Bring one hand into the frame, with your whole wrist visible.';
 if(!handQuality(lm))return 'Move a little closer and keep all your fingertips inside the frame.';
 const up=[8,12,16,20].map((tip,i)=>dist(lm[tip],lm[0])>dist(lm[[6,10,14,18][i]],lm[0])*1.12);
 const expected={A:[0,0,0,0],B:[1,1,1,1],D:[1,0,0,0],F:[0,1,1,1],I:[0,0,0,1],L:[1,0,0,0],U:[1,1,0,0],V:[1,1,0,0],W:[1,1,1,0],Y:[0,0,0,1],S:[0,0,0,0]};
 const pattern=expected[target];const names=['index','middle','ring','little'];
 if(pattern){const i=pattern.findIndex((v,i)=>Boolean(v)!==up[i]);if(i!==-1)return `${pattern[i]?'Try extending':'Try curling'} your ${names[i]} finger. Keep your wrist relaxed.`;}
 if(target==='V'&&dist(lm[8],lm[12])<dist(lm[5],lm[17])*.45)return 'Separate your index and middle fingers into a clear V.';
 if(target==='U'&&dist(lm[8],lm[12])>dist(lm[5],lm[17])*.45)return 'Bring your index and middle fingers together.';
 if(target==='L'&&dist(lm[4],lm[5])<dist(lm[5],lm[17])*.65)return 'Extend your thumb away from your palm to make an L.';
 return 'Compare your thumb placement with the example. Face the camera and hold still.';
}
