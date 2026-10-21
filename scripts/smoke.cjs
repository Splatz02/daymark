const { _electron: electron } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
(async()=>{
  const env={...process.env,DAYMARK_SMOKE:'1'}; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({args:['.'],env});
  let page;
  try {
    page=await app.firstWindow();await page.waitForSelector('h1');
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.getByRole('button',{name:'New task'}).click();
    await page.getByRole('textbox',{name:'Task name'}).fill('Edit daily video');
    await page.getByRole('textbox',{name:'Task notes'}).fill('Export the final video after checking captions.');
    await page.getByRole('spinbutton',{name:'Estimated minutes'}).fill('45');
    await page.getByLabel('Repeat this task').check();
    await page.getByRole('combobox',{name:'Repeat unit'}).selectOption('day');
    await page.getByRole('textbox',{name:'Add a checklist step'}).fill('Rough cut');
    await page.getByRole('textbox',{name:'Add a checklist step'}).press('Enter');
    await page.getByRole('textbox',{name:'Add a checklist step'}).fill('Check captions');
    await page.getByRole('button',{name:'Create task'}).click();
    await page.getByRole('heading',{name:'Edit daily video',exact:true}).waitFor();
    await page.getByRole('button',{name:'Edit Edit daily video',exact:true}).click();
    await page.getByRole('button',{name:/Only /}).click();
    await page.getByRole('checkbox',{name:'Complete step 1'}).check();
    await page.getByRole('button',{name:'Save changes'}).click();
    assert.match(await page.locator('.checklist-meter').innerText(),/1\/2/);
    await page.getByRole('button',{name:'Next day',exact:true}).click();
    assert.equal(await page.locator('.task-card').count(),2);
    assert.match(await page.locator('.checklist-meter').first().innerText(),/0\/2/);
    await page.getByRole('button',{name:'Today',exact:true}).click();
    await page.getByRole('button',{name:'Complete Edit daily video',exact:true}).click();
    assert.equal(await page.locator('.task-card').count(),0);
    await page.getByRole('button',{name:'Completed',exact:true}).click();
    await page.locator('.archive-title').getByText('Edit daily video',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Restore',exact:true}).click();
    await page.getByRole('button',{name:/My board/}).click();
    await page.getByRole('heading',{name:'Edit daily video',exact:true}).waitFor();
    // Real HTML drag-and-drop moves a card into progress and the Done drop area.
    await page.evaluate(()=>{window.dragEvents=[];for(const name of ['dragstart','dragenter','dragover','drop','dragend'])document.addEventListener(name,e=>window.dragEvents.push({name,target:e.target.className,data:e.dataTransfer?.getData('text/plain')}),true);});
    await page.bringToFront();
    await page.locator('.task-card').dragTo(page.locator('.board-column.blue .column-heading'),{sourcePosition:{x:20,y:20}});
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.board-column.blue .task-card').count(),1);
    // A second OS pointer drag immediately after moving/reparenting the source is unreliable
    // on hosted runners. Use the browser's HTML drag events for the Done target.
    const transfer=await page.evaluateHandle(()=>new DataTransfer());
    await page.locator('.task-card').dispatchEvent('dragstart',{dataTransfer:transfer});
    await page.locator('.done-zone').dispatchEvent('dragover',{dataTransfer:transfer});
    await page.locator('.done-zone').dispatchEvent('drop',{dataTransfer:transfer});
    await transfer.dispose();
    await page.locator('.task-card').waitFor({state:'detached'});
    assert.equal(await page.locator('.task-card').count(),0);
    // Shared progress travels to the next date.
    await page.getByRole('button',{name:'New task'}).click();
    await page.getByRole('textbox',{name:'Task name'}).fill('Continuing project');
    await page.getByLabel('Repeat this task').check();
    await page.getByRole('combobox',{name:'Repeat unit'}).selectOption('day');
    await page.getByRole('textbox',{name:'Add a checklist step'}).fill('First milestone');
    await page.getByText('Carry progress forward',{exact:true}).click();
    await page.getByRole('button',{name:'Create task'}).click();
    await page.getByRole('button',{name:'Edit Continuing project',exact:true}).click();
    await page.getByRole('checkbox',{name:'Complete step 1'}).check();
    await page.getByRole('button',{name:'Save changes'}).click();
    await page.getByRole('button',{name:'Next day',exact:true}).click();
    const shared=page.locator('.task-card').filter({has:page.getByRole('heading',{name:'Continuing project',exact:true})});
    assert.equal(await shared.count(),2);
    for(const card of await shared.all()) assert.match(await card.innerText(),/1\/1/);
    // Unscheduled backlog and editing its status.
    await page.getByRole('button',{name:'Add to Anytime',exact:true}).click();
    await page.getByRole('textbox',{name:'Task name'}).fill('Explore a new idea');
    assert.equal(await page.getByRole('checkbox',{name:'Schedule task'}).isChecked(),false);
    await page.getByRole('button',{name:'Create task'}).click();
    await page.getByRole('button',{name:'Edit Explore a new idea',exact:true}).click();
    await page.getByRole('combobox',{name:'Task status'}).selectOption('progress');
    await page.getByRole('button',{name:'Save changes'}).click();
    assert.equal(await page.locator('.board-column.blue').getByRole('heading',{name:'Explore a new idea'}).count(),1);
    await page.getByRole('button',{name:'Calendar',exact:true}).click();
    assert.equal(await page.locator('.calendar-grid').count(),1);
    await page.getByRole('button',{name:'Week',exact:true}).click();
    assert.equal(await page.locator('.calendar-cell').count(),7);
    await page.getByRole('button',{name:'Month',exact:true}).click();
    assert.ok(await page.locator('.calendar-cell').count()>=28);
    // Verify native persistence via the narrow bridge, and reload the renderer.
    await page.getByText('Saved on this device',{exact:true}).waitFor();
    const stored=await page.evaluate(async()=>window.daymark.load());assert.equal(stored.data.tasks.length,3);
    await page.reload();await page.getByRole('heading',{name:'Make room for today.'}).waitFor();
    await page.getByRole('heading',{name:'Continuing project',exact:true}).waitFor();
    assert.equal(errors.length,0,errors.join('\n'));
    await fs.mkdir('artifacts',{recursive:true});
    await page.screenshot({path:'artifacts/desktop-tested.png',fullPage:true});
    console.log('PASS: native launch, task creation, fresh/shared checklists, future dates, completion, archive restore, drag/drop, backlog, status editing, calendar views, disk persistence, renderer reload. No renderer errors.');
  } catch(error) { if(page){await fs.mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/test-failure.png',fullPage:true});console.error(await page.evaluate(()=>window.dragEvents));}throw error; } finally { await app.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
