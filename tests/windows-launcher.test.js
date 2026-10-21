import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawn} from 'node:child_process';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {launchWindowsInstaller}=require('../electron/windows-launcher.cjs');
const windows=process.platform==='win32';
async function fixture(source){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'daymark-launch-test-'));const script=path.join(directory,'helper with spaces.ps1');await fs.writeFile(script,source);return {directory,script,resultFile:path.join(directory,'result.json')};}
const parameters='param([int]$ParentProcess,[string]$Installer,[string]$Destination,[string]$ResultFile,[string]$Version,[string]$ReadyFile,[string]$UserDataDirectory)\n';
test('Windows helper acknowledges startup, survives its parent exiting, and completes afterwards',{skip:!windows},async()=>{
 const f=await fixture(parameters+'[string]$PID | Set-Content -LiteralPath $ReadyFile\n$parent=Get-Process -Id $ParentProcess -ErrorAction SilentlyContinue\nif ($parent) { $parent.WaitForExit(10000) | Out-Null }\n@{success=$true;parentExited=$true} | ConvertTo-Json | Set-Content -LiteralPath $ResultFile\n');
 try{
  const parent=spawn(process.execPath,['tests/fixtures/windows-launch-parent.cjs',f.script,f.resultFile],{stdio:['ignore','pipe','pipe'],windowsHide:true});let errors='';parent.stderr.on('data',data=>{errors+=data;});
  assert.equal(await new Promise((resolve,reject)=>{parent.on('exit',resolve);parent.on('error',reject);}),0,errors);
  let receipt;for(let i=0;i<100;i++){try{receipt=JSON.parse((await fs.readFile(f.resultFile,'utf8')).replace(/^\uFEFF/,''));break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
  assert.equal(receipt?.success,true,'The helper must finish after its parent has exited.');
 }finally{await fs.rm(f.directory,{recursive:true,force:true,maxRetries:20,retryDelay:100});}
});
test('Windows helper startup failure is reported instead of claiming installation began',{skip:!windows},async()=>{
 const f=await fixture(parameters+'Write-Error "Intentional startup failure"\nexit 1\n');
 try{await assert.rejects(launchWindowsInstaller({...f,installer:'unused',destination:'unused',version:'1.2.0',userDataDirectory:'unused'}),/stopped before it was ready/);assert.match(await fs.readFile(f.resultFile+'.stderr.log','utf8'),/Intentional startup failure/);}finally{await fs.rm(f.directory,{recursive:true,force:true,maxRetries:20,retryDelay:100});}
});
test('Windows helper with no acknowledgment times out while the app remains open',{skip:!windows},async()=>{
 const f=await fixture(parameters+'Start-Sleep -Seconds 30\n');
 try{await assert.rejects(launchWindowsInstaller({...f,installer:'unused',destination:'unused',version:'1.2.0',userDataDirectory:'unused',timeoutMs:2000}),/did not start in time/);}finally{await fs.rm(f.directory,{recursive:true,force:true,maxRetries:20,retryDelay:100});}
});
