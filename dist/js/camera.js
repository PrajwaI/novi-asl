const CONNECTIONS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
async function createASLRecognizer(){
 const {FilesetResolver,GestureRecognizer}=await import('../vendor/mediapipe/vision_bundle.mjs');
 const vision=await FilesetResolver.forVisionTasks(new URL('../vendor/mediapipe/wasm',import.meta.url).href);
 const options={baseOptions:{modelAssetPath:new URL('../models/asl-static.task',import.meta.url).href,delegate:'GPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.65,minHandPresenceConfidence:.65,minTrackingConfidence:.65,cannedGesturesClassifierOptions:{scoreThreshold:1},customGesturesClassifierOptions:{maxResults:-1,scoreThreshold:0}};
 try{return await GestureRecognizer.createFromOptions(vision,options);}
 catch{options.baseOptions.delegate='CPU';return GestureRecognizer.createFromOptions(vision,options);}
}
export class SignCamera {
 constructor({video,canvas,onResult,onState,createRecognizer=createASLRecognizer}){
  Object.assign(this,{video,canvas,onResult,onState,createRecognizer});
  this.stream=null;this.recognizer=null;this.modelPromise=null;this.startPromise=null;
  this.active=false;this.destroyed=false;this.status='off';this.generation=0;
  this.facingMode='user';this.lastFrame=-1;this.lastRun=0;
 }
 setState(status,message){this.status=status;this.onState(status,message);}
 async loadModel(){
  if(this.destroyed)throw new Error('Camera has been destroyed');
  if(this.recognizer)return this.recognizer;
  if(!this.modelPromise){
   this.modelPromise=Promise.resolve().then(()=>this.createRecognizer()).then(model=>{
    if(this.destroyed){model.close();throw new Error('Model loading was cancelled');}
    this.recognizer=model;return model;
   }).finally(()=>{this.modelPromise=null;});
  }
  return this.modelPromise;
 }
 start(){
  if(this.destroyed||this.active)return Promise.resolve();
  if(this.startPromise)return this.startPromise;
  const id=++this.generation;
  const pending=this.open(id).finally(()=>{if(this.startPromise===pending)this.startPromise=null;});
  this.startPromise=pending;return pending;
 }
 async open(id){
  if(!globalThis.isSecureContext){this.setState('error','Camera access requires HTTPS or localhost. Open the secure published site.');return;}
  if(!navigator.mediaDevices?.getUserMedia){this.setState('error','This browser does not support camera access. Try a current version of Safari, Chrome, or Edge.');return;}
  this.setState('loading','Waiting for camera permission…');
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:this.facingMode},width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}}});
   if(id!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;this.video.srcObject=stream;
   const track=stream.getVideoTracks()[0];
   if(!track)throw Object.assign(new Error('No video track'),{name:'NotFoundError'});
   track.addEventListener('ended',()=>{
    if(id===this.generation&&this.stream===stream){this.stop();this.setState('error','The camera was disconnected. Reconnect it and try again.');}
   },{once:true});
   await this.video.play();
   if(id!==this.generation)return;
   this.setState('loading','Loading the ASL model…');
   await this.loadModel();if(id!==this.generation)return;
   if(track.readyState==='ended')throw Object.assign(new Error('Camera disconnected'),{name:'NotReadableError'});
   this.active=true;this.lastFrame=-1;this.lastRun=0;this.setState('active');this.loop();
  }catch(error){if(id!==this.generation)return;this.stop();const messages={NotAllowedError:'Camera access is blocked. Allow camera access in your browser’s site settings, then try again.',NotFoundError:'No camera was found. Connect a webcam or open Novi ASL on your phone.',NotReadableError:'Your camera is busy or disconnected. Check the camera and close other apps using it.',OverconstrainedError:'The camera cannot use these settings. Try another camera or browser.'};this.setState('error',messages[error.name]||'The hand-tracking model could not start. Check your connection, reload, and try again.');console.error('Camera initialization failed',error);}
 }
 loop(){
  if(!this.active)return;
  this.raf=requestAnimationFrame(()=>this.loop());const now=performance.now();
  if(this.video.readyState<2||this.video.currentTime===this.lastFrame||now-this.lastRun<75)return;
  this.lastFrame=this.video.currentTime;this.lastRun=now;
  try{const result=this.recognizer.recognizeForVideo(this.video,now);this.draw(result.landmarks);this.onResult(result,now);}catch(error){console.error('Hand tracking failed',error);this.stop();this.setState('error','Hand tracking stopped unexpectedly. Please restart your camera.');}
 }
 draw(hands){const w=this.video.videoWidth,h=this.video.videoHeight;if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}const ctx=this.canvas.getContext('2d');ctx.clearRect(0,0,w,h);
  for(const points of hands){ctx.lineWidth=Math.max(2,w/260);ctx.strokeStyle='#c9b4ff';ctx.lineCap='round';for(const [a,b]of CONNECTIONS){ctx.beginPath();ctx.moveTo(points[a].x*w,points[a].y*h);ctx.lineTo(points[b].x*w,points[b].y*h);ctx.stroke();}for(let i=0;i<points.length;i++){const p=points[i];ctx.beginPath();ctx.arc(p.x*w,p.y*h,[4,8,12,16,20].includes(i)?4.5:3,0,Math.PI*2);ctx.fillStyle=[4,8,12,16,20].includes(i)?'#8aebc1':'#f8f2ff';ctx.fill();}}
 }
 stop(){this.generation++;this.startPromise=null;this.active=false;cancelAnimationFrame(this.raf);this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;this.canvas.getContext('2d')?.clearRect(0,0,this.canvas.width,this.canvas.height);this.setState('off');}
 async flip(){if(!this.active)return;this.stop();this.facingMode=this.facingMode==='user'?'environment':'user';const transform=this.facingMode==='user'?'scaleX(-1)':'none';this.video.style.transform=transform;this.canvas.style.transform=transform;await this.start();}
 destroy(){this.destroyed=true;this.stop();this.recognizer?.close();this.recognizer=null;}
}
