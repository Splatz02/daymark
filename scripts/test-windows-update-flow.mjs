import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';
import {emptyData} from '../src/model.js';
const require=createRequire(import.meta.url);const {_electron:electron}=require('@playwright/test');const {selectRelease,downloadVerified}=require('../electron/update-core.cjs');const asar=require('@electron/asar');
if(process.platform!=='win32')throw new Error('Run this test on Windows.');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'daymark-full-update-'));
const installed=path.join(directory,'Installed Daymark'),profile=path.join(directory,'Isolated Profile');await fs.mkdir(installed);await fs.mkdir(profile);
const quote=value=>"'"+value.replaceAll("'","''")+"'";
let application,restartedPid;
try{
 // Use a genuinely older packaged app so the assertion verifies a real version change.
 const response=await fetch('https://api.github.com/repos/Splatz02/daymark/releases/tags/v1.1.1',{headers:{'User-Agent':'Daymark-Update-Test'}});assert.equal(response.ok,true);
 const baseline=selectRelease(await response.json(),'1.1.0','win32','x64');assert.equal(baseline.version,'1.1.1');
 const baselinePath=await downloadVerified(baseline,path.join(directory,'baseline'),()=>{});
 execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$p=Start-Process -FilePath ${quote(baselinePath)} -ArgumentList ${quote('/S /DAYMARK_TEST /D='+installed)} -WindowStyle Hidden -Wait -PassThru; exit $p.ExitCode`],{stdio:'inherit',windowsHide:true});
 const data=emptyData();data.workspaces.push({id:'business',name:'Business',icon:'briefcase',color:'blue',dailyCapacity:240});data.tasks.push({id:'preserve',workspaceId:'business',title:'Keep this task through the update',description:'Important saved notes',date:null,priority:'normal',estimate:30,checklistMode:'shared',checklist:[{id:'step',title:'Saved checklist',checked:true}],status:'progress',recurrence:null});
 await fs.writeFile(path.join(profile,'daymark.json'),JSON.stringify(data));
 const executable=path.join(installed,'Daymark.exe'),installer=path.resolve(`release/Daymark-${pkg.version}-Windows-x64.exe`);
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.DAYMARK_SMOKE;
 application=await electron.launch({executablePath:executable,args:['--user-data-dir='+profile],env});
 assert.equal(await application.evaluate(({app})=>app.getVersion()),'1.1.1');
 // Load the repaired updater into the older app. The initial repair normally comes
 // from running the new installer once; subsequent updates use this exact module.
 await application.evaluate(({app,ipcMain,BrowserWindow},input)=>{
  const require=process.getBuiltinModule('module').createRequire(input.module);
  const fs=require('node:fs');const {createHash}=require('node:crypto');const bytes=fs.readFileSync(input.installer);const name=require('node:path').basename(input.installer);
  const release={tag_name:'v'+input.version,assets:[{name,state:'uploaded',size:bytes.length,digest:'sha256:'+createHash('sha256').update(bytes).digest('hex'),browser_download_url:`https://github.com/Splatz02/daymark/releases/download/v${input.version}/${name}`}]};
  global.testUpdater=require(input.module).createUpdater({app,send:state=>BrowserWindow.getAllWindows().forEach(w=>w.webContents.send('updates:state',state)),flush:async()=>{},quit:()=>app.quit(),openExternal:async()=>{},fetcher:async url=>url.includes('/releases/latest')?Response.json(release):new Response(bytes)});
  for(const [channel,method] of Object.entries({'updates:get':'state','updates:check':'check','updates:download':'download','updates:install':'install','updates:defer':'defer'})){ipcMain.removeHandler(channel);ipcMain.handle(channel,()=>global.testUpdater[method]());}
 },{module:path.resolve('electron/updater.cjs'),installer,version:pkg.version});
 const page=await application.firstWindow();await page.getByRole('button',{name:'Settings & backups',exact:true}).click();await page.getByRole('button',{name:'Check for updates',exact:true}).click();
 await page.getByRole('button',{name:'Download update',exact:true}).click();
 await page.getByRole('button',{name:'Install & restart',exact:true}).last().waitFor({timeout:30000});
 const closed=application.waitForEvent('close',{timeout:30000});await page.getByRole('button',{name:'Install & restart',exact:true}).last().click();await closed;application=null;
 const record=path.join(profile,'updates/install-result.json');let receipt;
 for(let i=0;i<240;i++){try{receipt=JSON.parse((await fs.readFile(record,'utf8')).replace(/^\uFEFF/,''));if(receipt.success)break;}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
 assert.equal(receipt?.success,true,JSON.stringify(receipt));assert.equal(receipt.version,pkg.version);
 assert.equal(JSON.parse(asar.extractFile(path.join(installed,'resources/app.asar'),'package.json').toString()).version,pkg.version);
 const saved=JSON.parse(await fs.readFile(path.join(profile,'daymark.json'),'utf8'));assert.deepEqual(saved.tasks,data.tasks);assert.deepEqual(saved.workspaces,data.workspaces);
 const backups=(await fs.readdir(profile)).filter(name=>name.startsWith('daymark-before-update-1.1.1-'));assert.equal(backups.length,1);assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,backups[0]),'utf8')).tasks,data.tasks);
 for(let i=0;i<60;i++){
  receipt=JSON.parse((await fs.readFile(record,'utf8')).replace(/^\uFEFF/,''));
  if(receipt.confirmedVersion===pkg.version){restartedPid=receipt.processId;break;}await new Promise(resolve=>setTimeout(resolve,500));
 }
 assert.ok(restartedPid,'The updated app must reopen and confirm its actual version in the same isolated profile.');
 process.kill(restartedPid,0);
 console.log(`PASS: real 1.1.1 app detects/downloads ${pkg.version}, acknowledges the Windows helper, exits, installs ${pkg.version}, preserves both workspaces/checklist/notes, makes a backup, and automatically reopens the updated executable with the same data profile.`);
}catch(error){for(const file of ['install.log','install-result.json','install-result.json.stdout.log','install-result.json.stderr.log']){try{console.error(file,await fs.readFile(path.join(profile,'updates',file),'utf8'));}catch{}}console.error(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Get-CimInstance Win32_Process -Filter \"name = 'Daymark.exe'\" | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine | ConvertTo-Json"],{encoding:'utf8',windowsHide:true}));throw error;}
finally{
 if(application)await application.close();
 if(restartedPid)execFileSync('taskkill.exe',['/PID',String(restartedPid),'/T','/F'],{stdio:'ignore',windowsHide:true});
 // The isolated installation is retained in the OS temp directory for inspection.
}
