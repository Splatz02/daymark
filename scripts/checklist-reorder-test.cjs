const {_electron:electron,expect}=require('@playwright/test');
const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
(async()=>{
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'daymark-checklist-test-'));
 const env={...process.env};delete env.DAYMARK_SMOKE;delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({args:['.','--user-data-dir='+profile],env});let page;
 try{
  const actualProfile=await app.evaluate(({app})=>app.getPath('userData'));
  assert.equal((await fs.realpath(actualProfile)).toLowerCase(),(await fs.realpath(profile)).toLowerCase(),'Refuse task changes outside the explicit temporary test profile.');
  page=await app.firstWindow();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.getByRole('button',{name:'New task'}).click();
  await page.getByRole('textbox',{name:'Task name',exact:true}).fill('Checklist order');
  async function addSteps(titles){for(const title of titles){await page.getByRole('textbox',{name:'Add a checklist step',exact:true}).fill(title);await page.getByRole('textbox',{name:'Add a checklist step',exact:true}).press('Enter');}}
  const values=()=>page.getByRole('list',{name:'Checklist steps',exact:true}).getByRole('textbox').evaluateAll(inputs=>inputs.map(input=>input.value));
  await addSteps(['Prepare','Edit','Publish']);await page.getByRole('checkbox',{name:'Complete step 1',exact:true}).check();
  // Use a real native pointer drag from the handle into the lower half of the last row.
  const destination=page.getByRole('list',{name:'Checklist steps',exact:true}).getByRole('listitem').last();const box=await destination.boundingBox();
  await page.getByRole('button',{name:'Reorder step 1',exact:true}).dragTo(destination,{targetPosition:{x:100,y:box.height-3}});
  await expect.poll(values).toEqual(['Edit','Publish','Prepare']);assert.equal(await page.getByRole('checkbox',{name:'Complete step 3',exact:true}).isChecked(),true);
  await page.getByRole('button',{name:'Create task',exact:true}).click();
  await expect.poll(async()=>{const {data}=await page.evaluate(()=>window.daymark.load());return data?.tasks[0]?.checklist.map(step=>step.title);}).toEqual(['Edit','Publish','Prepare']);
  const original=(await page.evaluate(()=>window.daymark.load())).data.tasks[0].checklist;const ids=Object.fromEntries(original.map(step=>[step.title,step.id]));
  await page.getByRole('button',{name:'Edit Checklist order',exact:true}).click();
  // A handle can also be reordered with a keyboard; focus follows the same step.
  await page.getByRole('button',{name:'Reorder step 3',exact:true}).focus();await page.keyboard.press('ArrowUp');
  await expect.poll(values).toEqual(['Edit','Prepare','Publish']);await expect(page.getByRole('button',{name:'Reorder step 2',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Edit Checklist order',exact:true}).click();
  assert.deepEqual(await values(),['Edit','Publish','Prepare']);
  await page.getByRole('button',{name:'Reorder step 3',exact:true}).focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');
  await expect.poll(values).toEqual(['Prepare','Edit','Publish']);await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect.poll(async()=>{const {data}=await page.evaluate(()=>window.daymark.load());return data.tasks[0].checklist.map(step=>step.title);}).toEqual(['Prepare','Edit','Publish']);
  const saved=(await page.evaluate(()=>window.daymark.load())).data.tasks[0].checklist;
  for(const step of saved){assert.equal(step.id,ids[step.title]);assert.equal(step.checked,step.title==='Prepare');}
  await page.reload();await page.getByRole('button',{name:'Edit Checklist order',exact:true}).click();assert.deepEqual(await values(),['Prepare','Edit','Publish']);
  const firstRow=page.getByRole('list',{name:'Checklist steps',exact:true}).getByRole('listitem').first();
  await page.getByRole('button',{name:'Reorder step 3',exact:true}).dragTo(firstRow,{targetPosition:{x:100,y:3}});await expect.poll(values).toEqual(['Publish','Prepare','Edit']);assert.equal(await page.getByRole('checkbox',{name:'Complete step 2',exact:true}).isChecked(),true);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Edit Checklist order',exact:true}).click();
  // Cancelling a drag does not change order, and editing text does not start a drag.
  const transfer=await page.evaluateHandle(()=>new DataTransfer());const handle=page.getByRole('button',{name:'Reorder step 1',exact:true});
  await handle.dispatchEvent('dragstart',{dataTransfer:transfer,clientX:10,clientY:10});await handle.dispatchEvent('dragend',{dataTransfer:transfer});await transfer.dispose();assert.deepEqual(await values(),['Prepare','Edit','Publish']);
  await page.getByRole('textbox',{name:'Step 2',exact:true}).fill('Edit carefully');await page.getByRole('button',{name:'Save changes',exact:true}).click();
  // An occurrence-specific reorder must not change the repeating template or future days.
  await page.getByRole('button',{name:'New task'}).click();await page.getByRole('textbox',{name:'Task name',exact:true}).fill('Daily checklist');
  await page.getByLabel('Repeat this task').check();await page.getByRole('combobox',{name:'Repeat unit',exact:true}).selectOption('day');await addSteps(['First','Second','Third']);await page.getByRole('button',{name:'Create task',exact:true}).click();
  await page.getByRole('button',{name:'Edit Daily checklist',exact:true}).click();await page.getByRole('button',{name:/^Only /}).click();await page.getByRole('checkbox',{name:'Complete step 1',exact:true}).check();
  await page.getByRole('button',{name:'Reorder step 3',exact:true}).focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect.poll(async()=>{const {data}=await page.evaluate(()=>window.daymark.load());const task=data.tasks.find(task=>task.title==='Daily checklist');return data.overrides[task.id+'@'+task.date]?.checklist?.map(step=>step.title);}).toEqual(['Third','First','Second']);
  const {data}=await page.evaluate(()=>window.daymark.load());const routine=data.tasks.find(task=>task.title==='Daily checklist');assert.deepEqual(routine.checklist.map(step=>step.title),['First','Second','Third']);assert.equal(data.overrides[routine.id+'@'+routine.date].checklist.find(step=>step.title==='First').checked,true);
  await page.getByRole('button',{name:'Edit Daily checklist',exact:true}).click();await page.getByRole('button',{name:'Reorder step 3',exact:true}).focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await page.getByRole('button',{name:'Next day',exact:true}).click();await page.getByRole('button',{name:'Edit Daily checklist',exact:true}).first().click();await page.getByRole('button',{name:/^Only /}).click();assert.deepEqual(await values(),['Third','First','Second']);assert.equal(await page.getByRole('checkbox',{name:'Complete step 2',exact:true}).isChecked(),false);
  assert.deepEqual(errors,[]);await fs.mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/checklist-reorder-tested.png',fullPage:true});
  console.log('PASS: real handle drag/drop, keyboard reordering/focus, checked state and stable IDs, cancel without saving, cancelled drag, text edits, save/reopen/reload persistence, and isolated occurrence/template ordering with fresh next-day progress.');
 }catch(error){if(page){await fs.mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/checklist-reorder-failure.png',fullPage:true});}throw error;}
 finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
