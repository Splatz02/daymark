import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
if(process.platform!=='win32')throw new Error('Run this test on Windows.');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));const installer=path.resolve(`release/Daymark-${pkg.version}-Windows-x64.exe`);
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'daymark-windows-update-'));const installed=path.join(directory,'Installed Daymark');await fs.mkdir(installed);await fs.writeFile(path.join(installed,'Daymark.exe'),'old app placeholder');
const tasks=path.join(directory,'daymark.json');await fs.writeFile(tasks,'{"tasks":["preserve my work"]}');const result=path.join(directory,'result.json');
execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','electron/install-windows.ps1','-ParentProcess','999999999','-Installer',installer,'-Destination',installed,'-ResultFile',result,'-Version',pkg.version,'-TestMode'],{stdio:'inherit'});
const receipt=JSON.parse((await fs.readFile(result,'utf8')).replace(/^\uFEFF/,''));assert.equal(receipt.success,true,receipt.message);const exe=await fs.readFile(path.join(installed,'Daymark.exe'));assert.equal(exe.subarray(0,2).toString(),'MZ');assert.equal(await fs.readFile(tasks,'utf8'),'{"tasks":["preserve my work"]}');assert.ok((await fs.stat(path.join(installed,'resources/app.asar'))).size>0);
console.log('PASS: real Windows installer applies silently to the specified existing folder (including spaces), reports success, preserves task data; test mode skips all desktop shortcuts and registry changes.');
// Kept in the OS temporary directory for inspection; never recursively delete an installation path.
