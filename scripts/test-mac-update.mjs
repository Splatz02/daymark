import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
if(process.platform!=='darwin')throw new Error('Run this test on macOS.');
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));const arch=process.argv[2];
const archive=path.resolve(`release/Daymark-${pkg.version}-Mac-${arch}.zip`);
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'daymark-update-test-'));
try{
 await fs.mkdir(path.join(directory,'unpacked'));execFileSync('/usr/bin/ditto',['-x','-k',archive,path.join(directory,'unpacked')]);
 const app=path.join(directory,'Daymark.app');execFileSync('/usr/bin/ditto',[path.join(directory,'unpacked/Daymark.app'),app]);
 await fs.mkdir(path.join(directory,'updates'));await fs.mkdir(path.join(directory,'bin'));
 await fs.writeFile(path.join(directory,'bin/open'),'#!/bin/bash\nprintf "%s\\n" "$1" > "'+path.join(directory,'opened.txt')+'"\n',{mode:0o755});
 const tasks=path.join(directory,'daymark.json');await fs.writeFile(tasks,'{"tasks":["preserve my work"]}');
 const result=path.join(directory,'updates/result.json');
 execFileSync('/bin/bash',['electron/install-mac.sh','999999999',archive,app,result,pkg.version],{env:{...process.env,PATH:path.join(directory,'bin')+':'+process.env.PATH},stdio:'inherit'});
 assert.equal(JSON.parse(await fs.readFile(result,'utf8')).success,true);assert.equal((await fs.readFile(path.join(directory,'opened.txt'),'utf8')).trim(),app);assert.equal(await fs.readFile(tasks,'utf8'),'{"tasks":["preserve my work"]}');
 execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',app]);assert.ok((await fs.readdir(directory)).some(f=>f.startsWith('.Daymark-previous-')));
 // A mismatched version fails before replacing the installed app, preserving both the app and task data.
 await assert.rejects(async()=>execFileSync('/bin/bash',['electron/install-mac.sh','999999999',archive,app,result,'99.0.0'],{env:{...process.env,PATH:path.join(directory,'bin')+':'+process.env.PATH},stdio:'pipe'}));
 assert.equal(JSON.parse(await fs.readFile(result,'utf8')).success,false);execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',app]);assert.equal(await fs.readFile(tasks,'utf8'),'{"tasks":["preserve my work"]}');
 console.log(`PASS: macOS ${arch} update extracts, validates identity/version/signature, replaces the app, retains a rollback copy, requests relaunch, preserves data, and rejects mismatched payloads.`);
}finally{
 if(path.dirname(directory)!==os.tmpdir()||!path.basename(directory).startsWith('daymark-update-test-'))throw new Error('Unexpected test cleanup path.');
 await fs.rm(directory,{recursive:true,force:true});
}
