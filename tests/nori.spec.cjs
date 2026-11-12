const {test,expect}=require('@playwright/test');
const open=async page=>page.getByRole('button',{name:'Open Nori learning companion'}).click();
const reply=text=>JSON.stringify({type:'delta',text})+'\n'+JSON.stringify({type:'done'})+'\n';
test('current lesson, safe rendering, continuity, keyboard focus and deletion across both pages',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));let sent;
  await page.route('**/api/nori/chat',route=>{sent=route.request().postDataJSON();return route.fulfill({contentType:'application/x-ndjson',body:reply('<img src=x onerror="window.pwned=true"> Keep your wrist relaxed.')});});
  await page.goto('/');await page.locator('#letter-grid [data-letter="J"]').click();await open(page);
  await expect(page.locator('#nori-input')).toBeFocused();await page.getByRole('button',{name:'Explain this letter',exact:true}).click();
  await expect(page.locator('.nori-state')).toContainText('Reply complete');expect(sent.context.selectedLetter).toBe('J');expect(sent.context.lesson.dynamic).toBe(true);
  expect(sent.context.camera).not.toHaveProperty('landmarks');await expect(page.locator('.nori-message img')).toHaveCount(0);expect(await page.evaluate(()=>window.pwned)).toBeUndefined();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open Nori learning companion'})).toBeFocused();
  await page.goto('/dojo.html?letter=V#learn');await open(page);await expect(page.locator('.nori-thread')).toContainText('Keep your wrist relaxed');
  await page.getByRole('button',{name:'Explain this letter',exact:true}).click();await expect(page.locator('.nori-state')).toContainText('Reply complete');expect(sent.context.selectedLetter).toBe('V');expect(sent.context.page).toBe('studio');
  await page.locator('.nori-foot summary').click();await page.getByRole('button',{name:'Delete conversation',exact:true}).click();await page.getByRole('button',{name:'Confirm delete conversation'}).click();
  await expect(page.locator('.nori-thread')).not.toContainText('Keep your wrist relaxed');await page.reload();await open(page);await expect(page.locator('.nori-thread')).not.toContainText('Keep your wrist relaxed');expect(errors).toEqual([]);
});
test('progress records, legacy study, future quiz tracking and built-in help survive navigation',async({page})=>{
  await page.addInitScript(()=>{if(!sessionStorage.seeded){localStorage.setItem('signly.academy.v1',JSON.stringify({selected:'B',studied:['A','B'],quizCorrect:9}));localStorage.setItem('signly.progress.v1',JSON.stringify({completed:['B','C'],correct:3,attempts:5,days:[],daily:{},history:[]}));sessionStorage.seeded='yes';}});
  await page.goto('/');await expect(page.locator('#explored-fraction')).toHaveText('3 / 26');
  await page.locator('#quiz-options button').first().click();const academy=await page.evaluate(()=>JSON.parse(localStorage.getItem('novi.academy.v1')));expect(academy.quizAttempts).toBe(1);expect(academy.quizHistory).toHaveLength(1);
  await open(page);await page.getByRole('button',{name:'Show my progress',exact:true}).click();await expect(page.locator('.nori-thread')).toContainText('3 of 26');await expect(page.locator('.nori-thread')).toContainText('2 manually studied and 2 camera-recognized');await expect(page.locator('.nori-thread')).toContainText('out of 1 answers since detailed tracking');
  await page.goto('/dojo.html#progress');await open(page);await page.getByRole('button',{name:'Show my progress',exact:true}).click();await expect(page.locator('.nori-thread')).toContainText('3 of 26');
  const keys=await page.evaluate(()=>Object.keys(localStorage));expect(keys).toContain('signly.progress.v1');
});
test('model failures, retry, duplicate prevention, cancellation and no frame-driven requests',async({page})=>{
  let calls=0,mode='error';
  await page.route('**/api/nori/chat',async route=>{calls++;if(mode==='error')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Magnitude is offline.'})});if(mode==='slow'){await new Promise(r=>setTimeout(r,1000));return route.fulfill({contentType:'application/x-ndjson',body:reply('Late reply')}).catch(()=>{});}return route.fulfill({contentType:'application/x-ndjson',body:reply('Ready again.')});});
  await page.goto('/dojo.html#learn');await open(page);await page.locator('#nori-input').fill('Help with my camera');await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.locator('.nori-state')).toContainText('offline');await expect(page.locator('.nori-message[data-kind=assistant]')).toHaveCount(0);
  mode='ok';await page.getByRole('button',{name:'Retry message'}).click();await expect(page.locator('.nori-state')).toContainText('Reply complete');
  mode='slow';await page.locator('#nori-input').fill('Explain A');await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByRole('button',{name:'Explain this letter',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Stop',exact:true}).click();await expect(page.locator('.nori-state')).toContainText('stopped');expect(calls).toBeLessThanOrEqual(3);
  const before=calls;await page.waitForTimeout(1100);expect(calls).toBe(before);
  await page.locator('.nori-foot summary').click();await page.getByRole('button',{name:'Camera help',exact:true}).click();await expect(page.locator('.nori-message').last()).toContainText('Built-in guide');expect(calls).toBe(before);
});
test('camera errors and word studio behavior remain available',async({page})=>{
  await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('test denial','NotAllowedError');};});
  await page.goto('/dojo.html#learn');await page.locator('#start-camera').click();await expect(page.locator('#feedback-text')).toContainText('blocked');
  await open(page);await page.locator('.nori-foot summary').click();await page.getByRole('button',{name:'Camera help',exact:true}).click();await expect(page.locator('.nori-thread')).toContainText('blocked');await page.keyboard.press('Escape');
  await page.goto('/dojo.html#words');await page.locator('#word-input').fill('JAZZ');await page.locator('#word-form button[type=submit]').click();await expect(page.locator('#word-error')).toContainText('motion grading');
  await page.locator('#word-input').fill('BOOK');await page.locator('#word-form button[type=submit]').click();await expect(page.locator('#word-tiles span')).toHaveCount(4);await expect(page.locator('#lesson-letter')).toHaveText('B');
  await page.route('**/api/nori/chat',route=>{const c=route.request().postDataJSON().context;expect(c.word).toEqual({text:'BOOK',position:0,complete:false});return route.fulfill({contentType:'application/x-ndjson',body:reply('Lower your hand between repeated letters.')});});
  await open(page);await page.getByRole('button',{name:'What should I practice next?',exact:true}).click();await expect(page.locator('.nori-state')).toContainText('Reply complete');
});
test('mobile bottom sheet fits, reduced motion, optional tips and blocked storage',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await open(page);
  const box=await page.locator('.nori-panel').boundingBox();expect(box.x).toBe(0);expect(box.width).toBe(390);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(845);
  expect(await page.locator('.nori-mascot').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.locator('.nori-foot summary').click();await page.locator('.nori-tips').uncheck();await page.keyboard.press('Escape');await page.reload();await page.waitForTimeout(3600);await expect(page.locator('.nori-tip')).toBeHidden();
  await open(page);await page.screenshot({path:'test-results/nori-mobile.png'});
  await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError');}});});await page.goto('/');await page.locator('#mark-studied').click();await open(page);await page.locator('.nori-foot summary').click();await expect(page.locator('.nori-storage')).toContainText('unavailable');await page.getByRole('button',{name:'Show my progress',exact:true}).click();await expect(page.locator('.nori-thread')).toContainText('1 of 26');
});
test('recognizer callbacks still award camera progress and complete repeated-letter words',async({page})=>{
  // Inject a test handle into the served module, without changing production code.
  // These are simulated classifier outputs, not a physical-webcam accuracy test.
  await page.route('**/js/camera.js',async route=>{const response=await route.fetch();const source=(await response.text()).replace('this.stream=null;','window.__testCamera=this;this.stream=null;');await route.fulfill({response,body:source});});
  await page.goto('/dojo.html#learn');
  async function sign(letter,base){await page.evaluate(({letter,base})=>{
    const camera=window.__testCamera;camera.active=true;
    const landmarks=Array.from({length:21},(_,i)=>({x:.4+(i%4)*.04,y:i===0?.8:.35+(i%5)*.04,z:0}));
    const result={landmarks:[landmarks],gestures:[[{categoryName:letter,score:.99},{categoryName:'None',score:.001}]]};
    for(let i=0;i<=11;i++)camera.onResult(result,base+i*100);
  },{letter,base});}
  await sign('A',100);await expect(page.locator('#lesson-completed')).toBeVisible();
  let p=await page.evaluate(()=>JSON.parse(localStorage.getItem('signly.progress.v1')));expect(p.correct).toBe(1);expect(p.completed).toEqual(['A']);
  await page.locator('#alphabet-grid [data-letter="J"]').click();await sign('J',2000);p=await page.evaluate(()=>JSON.parse(localStorage.getItem('signly.progress.v1')));expect(p.correct).toBe(1);
  await page.goto('/dojo.html?word=BOOK#words');
  for(const [i,letter]of [...'BOOK'].entries()){
    await expect(page.locator('#lesson-letter')).toHaveText(letter);
    if(i){await page.evaluate(base=>{window.__testCamera.onResult({landmarks:[],gestures:[]},base);window.__testCamera.onResult({landmarks:[],gestures:[]},base+400);},i*4000);}
    await sign(letter,i*4000+500);
    if(i<3)await page.waitForTimeout(1400);
  }
  await expect(page.locator('#feedback-title')).toHaveText('Word complete!');await open(page);await page.getByRole('button',{name:'Show my progress',exact:true}).click();await expect(page.locator('.nori-thread')).toContainText('4 of 26');
  p=await page.evaluate(()=>JSON.parse(localStorage.getItem('signly.progress.v1')));expect(p.correct).toBe(5);expect(p.completed.sort()).toEqual(['A','B','K','O']);
});
test('narrow mobile screen keeps settings and composer reachable; native dialog traps focus',async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.goto('/dojo.html');await open(page);await page.locator('.nori-foot summary').click();await page.getByRole('button',{name:'Delete conversation',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Delete conversation',exact:true})).toBeInViewport();
  await page.locator('#nori-input').focus();await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>document.querySelector('.nori-panel').contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await expect(page.locator('.nori-panel')).not.toBeVisible();
});
