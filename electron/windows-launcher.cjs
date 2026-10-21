const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');

async function launchWindowsInstaller({script,installer,destination,resultFile,version,userDataDirectory,parentProcess=process.pid,timeoutMs=20000,spawnProcess=spawn}){
 const readyFile=resultFile+'.ready';
 const logFile=path.join(path.dirname(resultFile),'install.log');
 const startedFile=resultFile+'.started';
 await fsp.rm(readyFile,{force:true});
 await fsp.rm(startedFile,{force:true});
 const requestFile=resultFile+'.request.json';
 await fsp.writeFile(requestFile,JSON.stringify({script,installer,destination,resultFile,version,userDataDirectory,parentProcess,readyFile}));
 const bootstrap=path.join(path.dirname(resultFile),'start-windows-update.ps1');
 await fsp.copyFile(path.join(__dirname,'start-windows-update.ps1'),bootstrap);
 const log=fs.openSync(logFile,'a');
 let child;
 try{
  const executable=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const args=['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',bootstrap,'-RequestFile',requestFile];
  // The short bootstrap uses Start-Process to give the actual worker its own hidden console.
  child=spawnProcess(executable,args,{detached:false,windowsHide:true,stdio:['ignore',log,log],cwd:path.dirname(resultFile)});
 }finally{fs.closeSync(log);}
 let exitCode=null,launchError,workerPid;
 const onExit=code=>{exitCode=code;};const onError=error=>{launchError=error;};
 child.once('exit',onExit);child.once('error',onError);
 try{
  const start=Date.now();
  while(true){
   if(launchError)throw launchError;
   if(exitCode!==null&&exitCode!==0)throw new Error(`The Windows update helper stopped before it was ready. Details: ${logFile}`);
   try{
    workerPid=Number((await fsp.readFile(startedFile,'utf8')).replace(/^\uFEFF/,'').trim());
    if(Number.isSafeInteger(workerPid)&&workerPid>0&&(await fsp.readFile(readyFile,'utf8')).replace(/^\uFEFF/,'').trim()===String(workerPid))break;
    if(Number.isSafeInteger(workerPid)&&workerPid>0){try{process.kill(workerPid,0);}catch{throw new Error(`The Windows update helper stopped before it was ready. Details: ${resultFile}.stderr.log`);}}
   }catch(error){if(error.code!=='ENOENT')throw error;}
   if(Date.now()-start>timeoutMs)throw new Error(`The Windows update helper did not start in time. Details: ${logFile}`);
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  child.unref();
  return child;
 }catch(error){child.kill();if(Number.isSafeInteger(workerPid)&&workerPid>0){try{process.kill(workerPid);}catch{}}throw error;}
 finally{child.removeListener('exit',onExit);child.removeListener('error',onError);}
}
module.exports={launchWindowsInstaller};
