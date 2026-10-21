const { _electron: electron }=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 const env={...process.env,DAYMARK_SMOKE:'1'};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:path.resolve('release/win-unpacked/Daymark.exe'),args:[],env});
 let profile;
 try {
  const page=await app.firstWindow();await page.getByRole('heading',{name:'Make room for today.'}).waitFor();
  profile=await app.evaluate(({app})=>app.getPath('userData'));
  const exported=path.join(profile,'export-test.json'),incoming=path.join(profile,'import-test.json');
  await page.getByRole('button',{name:'New task'}).click();await page.getByRole('textbox',{name:'Task name'}).fill('Task to transfer');await page.getByRole('button',{name:'Create task'}).click();await page.getByText('Saved on this device',{exact:true}).waitFor();
  await app.evaluate(({dialog},exported)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:exported});},exported);
  await page.getByRole('button',{name:'Settings & backups',exact:true}).click();await page.getByRole('button',{name:'Export backup',exact:true}).click();
  await page.getByText('Backup exported. Ready for your other computer.').waitFor();
  const raw=JSON.parse(await fs.readFile(exported,'utf8'));assert.equal(raw.tasks[0].title,'Task to transfer');
  const copy=structuredClone(raw);copy.tasks[0].title='Imported task update';copy.tasks.push({...copy.tasks[0],id:'new-import',title:'Added from Mac'});await fs.writeFile(incoming,JSON.stringify(copy));
  await app.evaluate(({dialog},incoming)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[incoming]});},incoming);
  await page.getByRole('button',{name:'Import backup',exact:true}).click();await page.getByRole('button',{name:'Merge backup',exact:true}).click();
  await page.getByRole('heading',{name:'Imported task update',exact:true}).waitFor();assert.equal(await page.locator('.task-card').count(),2);
  await page.getByRole('button',{name:'Settings & backups',exact:true}).click();
  await fs.writeFile(incoming,JSON.stringify(raw));await page.getByRole('button',{name:'Import backup',exact:true}).click();await page.getByRole('button',{name:'Replace',exact:true}).click();
  await page.getByRole('heading',{name:'Task to transfer',exact:true}).waitFor();assert.equal(await page.locator('.task-card').count(),1);
  await fs.writeFile(incoming,JSON.stringify({schema:1,tasks:[{title:'corrupt'}],overrides:{}}));
  await page.getByRole('button',{name:'Settings & backups',exact:true}).click();await page.getByRole('button',{name:'Import backup',exact:true}).click();
  await page.getByText('A task in this backup is incomplete or invalid.').waitFor();await page.getByRole('button',{name:'Close dialog',exact:true}).click();assert.equal(await page.locator('.task-card').count(),1);
  await page.getByText('Saved on this device',{exact:true}).waitFor();
  assert.ok(JSON.parse(await fs.readFile(path.join(profile,'daymark.json.bak'),'utf8')).tasks.length>0);
  // Undo completion after a later task is created must keep the new task.
  await page.getByRole('button',{name:'Complete Task to transfer',exact:true}).click();await page.getByRole('button',{name:'New task'}).click();await page.getByRole('textbox',{name:'Task name'}).fill('Keep this later task');await page.getByRole('button',{name:'Create task'}).click();
  // Creating a task replaces the toast. Explicit restore still keeps later work intact.
  await page.getByRole('button',{name:'Completed',exact:true}).click();await page.getByRole('button',{name:'Restore',exact:true}).click();await page.getByRole('button',{name:/My board/}).click();assert.equal(await page.locator('.task-card').count(),2);
  console.log('PASS: packaged Daymark.exe launches; native file export; merge by identity; replacement import; malformed backup rejection; previous-save backup; completion restore preserves later work.');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
