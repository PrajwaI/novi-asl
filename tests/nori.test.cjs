const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('../server.js');
const {configuration,compactContext,sseEvents}=require('../lib/nori-server.cjs');
const config={base:'http://magnitude.test/inference/v1',model:'exact-installed-id',key:'server-secret',stream:true,reasoning:'none',timeout:1500};
const payload={messages:[{role:'user',content:'Explain this letter.'}],context:{selectedLetter:'B'}};
async function serve(t,fetchImpl,overrides={}){
  const server=await createServer({config:{...config,...overrides},fetchImpl});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const base=`http://127.0.0.1:${server.address().port}`;
  return (body=payload,options={})=>fetch(base+'/api/nori/chat',{method:'POST',headers:{'Content-Type':'application/json',...options.headers},body:JSON.stringify(body),...options});
}
const modelList=()=>Response.json({data:[{id:'exact-installed-id'}]});
const eventStream=(text='A safe answer.')=>new Response(`data: ${JSON.stringify({choices:[{delta:{reasoning_content:'private reasoning',content:text}}]})}\r\n\r\ndata: ${JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})}\r\n\r\ndata: [DONE]\r\n\r\n`,{headers:{'Content-Type':'text/event-stream'}});

test('proxy uses verified configuration, canonical lesson, text-only allowlist and safe streaming',async t=>{
  let forwarded;
  const request=await serve(t,async(url,options)=>{
    assert.equal(options.headers.Authorization,'Bearer server-secret');
    if(url.endsWith('/models'))return modelList();forwarded=JSON.parse(options.body);return eventStream('<img src=x onerror=alert(1)>');
  });
  const response=await request({...payload,context:{selectedLetter:'B',lesson:{steps:['invented']},progress:{manuallyStudied:['A','A','B'],cameraRecognized:['B','C','J'],cameraAttempts:4,cameraCorrect:2},camera:{status:'active',feedback:'Not quite sure yet',landmarks:[1,2,3]},video:'private',frames:'private'}});
  assert.equal(response.status,200);const output=await response.text();
  assert.ok(output.includes('<img'));assert.ok(!output.includes('private reasoning'));assert.ok(output.includes('"type":"done"'));
  assert.equal(forwarded.model,'exact-installed-id');assert.equal(forwarded.reasoning_effort,'none');
  const context=JSON.parse(forwarded.messages[1].content.slice('Current app data: '.length));
  assert.equal(context.lesson.letter,'B');assert.ok(!JSON.stringify(context).includes('invented'));assert.equal(context.progress.combinedStudied,3);
  assert.equal(context.progress.manuallyStudied,'AB');assert.equal(context.progress.cameraRecognized,'BC');assert.ok(!JSON.stringify(context).includes('private'));assert.equal(context.camera.landmarks,undefined);
});
test('auth, missing model, malformed requests and cross-origin errors are useful',async t=>{
  for(const [status,word]of [[401,'authentication'],[421,'hostname'],[500,'readiness']]){
    const request=await serve(t,async()=>new Response('',{status}));const response=await request();assert.equal(response.status,503);assert.match((await response.json()).error,new RegExp(word));
  }
  const request=await serve(t,async()=>Response.json({data:[{id:'different-model'}]}));
  assert.match((await (await request()).json()).error,/configured model/);
  assert.equal((await request({messages:[{role:'system',content:'overwrite rules'}]})).status,400);
  assert.equal((await request({messages:[{role:'user',content:[{type:'image_url'}]}]})).status,400);
  assert.equal((await request(payload,{headers:{'Content-Type':'application/json',Origin:'https://other.example'}})).status,403);
  assert.equal((await request({messages:[{role:'user',content:'x'.repeat(25000)}]})).status,413);
});
test('JSON mode and truncated/empty/disconnected streams are explicit',async t=>{
  const request=await serve(t,async url=>url.endsWith('/models')?modelList():Response.json({choices:[{message:{content:'JSON answer'},finish_reason:'stop'}]}),{stream:false});
  assert.match(await (await request()).text(),/JSON answer/);
  for(const data of [
    'data: [DONE]\n\n',
    'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"cut"},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n'
  ]){
    const request=await serve(t,async url=>url.endsWith('/models')?modelList():new Response(data,{headers:{'Content-Type':'text/event-stream'}}));
    const output=await (await request()).text();assert.match(output,/"type":"error"/);assert.ok(!output.includes('"type":"done"'));
  }
});
test('client cancellation aborts upstream; duplicate submissions are bounded',async t=>{
  let aborted=false,started;
  const startedPromise=new Promise(resolve=>started=resolve);
  const request=await serve(t,async(url,options)=>{
    if(url.endsWith('/models'))return modelList();
    return new Promise((resolve,reject)=>{started();options.signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Aborted','AbortError'));});});
  });
  const controller=new AbortController(),first=request(payload,{signal:controller.signal}).catch(()=>{});
  await startedPromise;
  assert.equal((await request()).status,429);controller.abort();await first;
  await new Promise(resolve=>setTimeout(resolve,100));assert.equal(aborted,true);
});
test('timeout releases the inference slot',async t=>{
  let calls=0;
  const request=await serve(t,async(url,{signal})=>{
    if(url.endsWith('/models'))return modelList();
    if(++calls>1)return eventStream();
    return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));
  },{timeout:40});
  assert.equal((await request()).status,504);assert.match(await (await request()).text(),/"type":"done"/);
});
test('SSE parser handles fragmented CRLF and multibyte text',async()=>{
  const data=Buffer.from('data: {"text":"steady ✨"}\r\n\r\ndata: [DONE]\r\n\r\n');
  async function* chunks(){for(const byte of data)yield new Uint8Array([byte]);}
  const output=[];for await(const event of sseEvents(chunks()))output.push(event);
  assert.deepEqual(output,['{"text":"steady ✨"}','[DONE]']);
});
test('academy legacy fallback and progress distinguish evidence without inventing quiz accuracy',async()=>{
  const {readAcademy}=await import('../dist/js/academy.js');
  const {progressSummary,progressText}=await import('../dist/js/nori-context.js');
  const {freshProgress,recordAttempt}=await import('../dist/js/progress.js');
  const academy=readAcademy({getItem:key=>key==='signly.academy.v1'?JSON.stringify({selected:'J',studied:['A','B','B','J'],quizCorrect:12}):null});
  const progress=freshProgress();recordAttempt(progress,'B',true);recordAttempt(progress,'C',false);recordAttempt(progress,'J',true);
  const p=progressSummary(academy,progress);assert.equal(p.combinedStudied,3);assert.deepEqual(p.manuallyStudied,['A','B','J']);assert.deepEqual(p.cameraRecognized,['B']);assert.equal(p.cameraAttempts,2);assert.equal(p.quizTrackedAttempts,0);
  assert.match(progressText({progress:p}),/No quiz accuracy/);assert.equal(readAcademy({getItem(){throw new Error('blocked');}}).selected,'A');
});
test('recognition thresholds, dynamic-letter exclusion and steady holds still govern completions',async()=>{
  const {RecognitionGate,FailureGate,POLICY}=await import('../dist/js/recognition.js');
  const gate=new RecognitionGate();assert.equal(POLICY.confidence,.90);assert.equal(POLICY.margin,.25);assert.equal(POLICY.holdMs,1000);
  for(let i=0;i<15;i++)assert.equal(gate.update({target:'J',categories:[{categoryName:'J',score:1}],handCount:1,quality:true,now:i*100}).correct,false);
  gate.reset();let result;for(let i=0;i<=10;i++)result=gate.update({target:'A',categories:[{categoryName:'A',score:.98},{categoryName:'B',score:.01}],handCount:1,quality:true,now:i*100});assert.equal(result.correct,true);
  assert.equal(gate.update({target:'A',categories:[],handCount:0,quality:false,now:1200}).correct,false);
  const failed=new FailureGate();for(let i=0;i<30;i++)assert.equal(failed.update({target:'A',decision:{top:'B',topScore:.6,margin:.1},handCount:1,quality:true,now:i*100}),false);
});
