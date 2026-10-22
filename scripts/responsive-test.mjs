import {chromium, webkit, expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {emptyData} from '../src/model.js';

// Every context is temporary and gets sample data. No installed app/profile is used.
const engine=process.argv.includes('--webkit')?webkit:chromium;
const port=process.argv.find(argument=>argument.startsWith('--port='))?.split('=')[1]||'4177';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',port,'--strictPort'],{stdio:['ignore','pipe','pipe']});
let output='';
await new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(new Error('Web preview did not start: '+output)),20000);
 server.stdout.on('data',chunk=>{output+=chunk;if(output.includes('127.0.0.1:'+port)){clearTimeout(timeout);resolve();}});
 server.stderr.on('data',chunk=>{output+=chunk;});
 server.on('error',reject);server.on('exit',code=>{clearTimeout(timeout);reject(new Error('Web preview exited '+code+': '+output));});
}).catch(error=>{server.kill();throw error;});
let browser;
try{
 browser=await engine.launch({headless:true,...(process.argv.includes('--chrome')?{channel:'chrome'}:{})});
 await fs.mkdir('artifacts/responsive',{recursive:true});
 const errors=[];
 for(const viewport of [{width:320,height:568},{width:375,height:812},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:768,height:1024},{width:1024,height:768}]){
  const widthOption=process.argv.find(argument=>argument.startsWith('--width='));if(widthOption&&viewport.width!==Number(widthOption.split('=')[1]))continue;
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,locale:'en-US',timezoneId:'America/New_York',acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-10-22T16:00:00Z')});
  const sample=emptyData();sample.tasks=[{id:'video',workspaceId:sample.activeWorkspaceId,title:'Edit the next video with a longer title',description:'Notes and a link for the next project.',date:'2026-10-22',priority:'normal',estimate:45,recurrence:{unit:'day',interval:1,days:[],until:null},checklistMode:'fresh',repeatNotes:true,repeatChecklist:true,checklist:[{id:'a',title:'Rough cut',checked:false},{id:'b',title:'Check captions',checked:false}],createdAt:'2026-10-22T10:00:00Z'}];
  await page.addInitScript(data=>{if(!localStorage.getItem('daymark-data'))localStorage.setItem('daymark-data',JSON.stringify(data));},sample);
  await page.goto('http://127.0.0.1:'+port+'/');await page.getByText('Saved on this device',{exact:true}).waitFor({state:'attached'});
  async function fits(name){
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${viewport.width}: page overflows in ${name}`);
   const dialog=page.getByRole('dialog').last();if(await dialog.count()){
    assert.equal(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1),true,`${viewport.width}: dialog overflows in ${name}`);
    const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,`${viewport.width}: dialog outside viewport in ${name}`);
   }
   // Keep mobile viewport metrics intact, including landscape pointer queries.
   await page.screenshot({path:`artifacts/responsive/${engine.name()}-${viewport.width}-${name}.png`,animations:'disabled',caret:'hide'});
  }
  async function navigate(name){await page.getByRole('button',{name:'Open navigation',exact:true}).tap();await page.getByRole('button',{name,exact:true}).tap();await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toHaveAttribute('aria-expanded','false');}
  await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeVisible();await fits('board');
  await page.getByRole('button',{name:'Open navigation',exact:true}).tap();await fits('navigation');
  await page.getByRole('button',{name:'Close navigation',exact:true}).tap();
  // Real touch taps can complete/restore work without desktop drag-and-drop.
  await page.getByRole('button',{name:'Complete Edit the next video with a longer title',exact:true}).tap();
  await expect(page.locator('.task-card')).toHaveCount(0);await navigate('Completed');
  await page.getByRole('button',{name:'Restore',exact:true}).tap();await navigate('Calendar');
  await fits('calendar');await page.getByRole('button',{name:'Week',exact:true}).tap();await fits('week');
  await page.getByRole('button',{name:'Next calendar period',exact:true}).tap();
  await page.getByRole('button',{name:'Today',exact:true}).tap();
  await page.getByRole('button',{name:'Add agenda task',exact:true}).tap();
  await page.getByRole('textbox',{name:'Task name',exact:true}).fill('A phone task');
  await page.getByLabel('Repeat this task').check();await page.getByRole('combobox',{name:'Repeat unit',exact:true}).selectOption('week');
  await page.getByRole('button',{name:'Monday',exact:true}).tap();await fits('editor');
  await page.getByRole('textbox',{name:'Add a checklist step',exact:true}).fill('First step');await page.getByRole('textbox',{name:'Add a checklist step',exact:true}).press('Enter');
  await page.getByRole('textbox',{name:'Add a checklist step',exact:true}).fill('Second step');await page.getByRole('textbox',{name:'Add a checklist step',exact:true}).press('Enter');
  if(engine===chromium){
   // Exercise actual touch pointer capture, not HTML desktop drag events.
   await page.locator('.checklist-steps').evaluate(node=>node.scrollIntoView({block:'center'}));
   const handle=await page.getByRole('button',{name:'Reorder step 2',exact:true}).boundingBox();
   const target=await page.getByRole('listitem').first().boundingBox();
   const touch=await context.newCDPSession(page),x=handle.x+handle.width/2,y=handle.y+handle.height/2,endY=target.y+4;
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+(endY-y)*i/8}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
   await expect(page.getByRole('textbox',{name:'Step 1',exact:true})).toHaveValue('Second step');
   await page.getByRole('button',{name:'Reorder step 1',exact:true}).focus();await page.keyboard.press('ArrowDown');
  }
  // Keyboard alternative remains usable with narrow touch layouts.
  await page.getByRole('button',{name:'Reorder step 2',exact:true}).focus();await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('textbox',{name:'Step 1',exact:true})).toHaveValue('Second step');
  await page.getByRole('button',{name:'Create task',exact:true}).tap();
  await page.getByRole('button',{name:'Open settings',exact:true}).tap();await fits('settings');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export this workspace',exact:true}).tap();
  const saved=await download;const payload=JSON.parse(await fs.readFile(await saved.path(),'utf8'));assert.equal(payload.tasks.length,2);
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import into this workspace',exact:true}).tap();
  await (await chooser).setFiles({name:'sample-workspace.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  await fits('import');await page.getByRole('button',{name:'Merge tasks',exact:true}).tap();
  await page.getByRole('button',{name:'Open settings',exact:true}).tap();
  await page.getByRole('button',{name:'Edit workspace',exact:true}).tap();await fits('workspace');
  await page.getByRole('textbox',{name:'Workspace name',exact:true}).fill('A workspace with a longer name');await page.getByRole('button',{name:'Save workspace',exact:true}).tap();
  await page.reload();await page.getByRole('heading',{name:'Make room for today.',exact:true}).waitFor();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('daymark-data')));assert.equal(stored.tasks.length,2);assert.equal(stored.workspaces[0].name,'A workspace with a longer name');
  await page.getByRole('button',{name:'Edit Edit the next video with a longer title',exact:true}).tap();
  await page.getByRole('combobox',{name:'Task status',exact:true}).selectOption('progress');await page.getByRole('button',{name:'Save changes',exact:true}).tap();
  await expect(page.locator('.board-column.blue .task-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Edit Edit the next video with a longer title',exact:true}).tap();
  await page.getByRole('button',{name:'Delete',exact:true}).tap();await expect(page.getByRole('button',{name:'Delete task',exact:true})).toBeInViewport();await fits('delete');
  await page.getByRole('button',{name:'Keep task',exact:true}).tap();await page.getByRole('button',{name:'Cancel',exact:true}).tap();
  if(viewport.width===390){
   await page.getByRole('button',{name:'Open navigation',exact:true}).tap();
   await page.getByRole('button',{name:'Switch workspace',exact:true}).tap();await page.getByRole('button',{name:'Create workspace',exact:true}).tap();
   await page.getByRole('textbox',{name:'Workspace name',exact:true}).fill('Business');
   await page.getByRole('button',{name:'rocket icon',exact:true}).tap();await fits('new-workspace');
   await page.getByRole('button',{name:'Create workspace',exact:true}).tap();await fits('empty-workspace');
   await page.getByRole('button',{name:'Open navigation',exact:true}).tap();await page.getByRole('button',{name:'Switch workspace',exact:true}).tap();
   await page.getByRole('button',{name:'Switch to A workspace with a longer name',exact:true}).tap();await expect(page.locator('.task-card')).toHaveCount(2);
   await page.getByRole('button',{name:'Open navigation',exact:true}).tap();await page.getByRole('button',{name:'Switch workspace',exact:true}).tap();
   await page.getByRole('button',{name:'Edit Business workspace',exact:true}).tap();await page.getByRole('button',{name:'Delete workspace',exact:true}).tap();
   await page.getByRole('textbox',{name:'Confirm workspace name',exact:true}).fill('Business');await fits('delete-workspace');
   await page.getByRole('button',{name:'Permanently delete workspace',exact:true}).tap();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('daymark-data')).workspaces.length),1);
  }
  console.log(`PASS ${engine.name()} ${viewport.width}x${viewport.height}: layout, touch navigation, completion/restore, calendar, recurrence, checklist, workspace export/edit, persistence, status changes and delete confirmation.`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server.kill();}
