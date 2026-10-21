const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {API,RELEASES,selectRelease,downloadVerified}=require('./update-core.cjs');
function createUpdater({app,send,flush,quit,openExternal,fetcher=fetch,platform=process.platform,arch=process.arch}){
 let state={status:'idle',currentVersion:app.getVersion(),prompt:false};
 let release=null,downloadPath=null,settings={remindAt:0},busy=false,lastCheck=0;
 const directory=()=>path.join(app.getPath('userData'),'updates');
 const settingsPath=()=>path.join(directory(),'preferences.json');
 function emit(next){state={...state,...next};send(state);return state;}
 async function preferences(){await fs.mkdir(directory(),{recursive:true});await fs.writeFile(settingsPath(),JSON.stringify(settings));}
 const supported=()=>app.isPackaged&&['win32','darwin'].includes(platform)&&process.env.DAYMARK_SMOKE!=='1';
 async function check(manual=true){
  if(busy||['downloading','installing'].includes(state.status))return state;
  if(!supported())return emit({status:'unsupported',prompt:false});
  if(state.status==='ready'){return emit({prompt:manual||Date.now()>settings.remindAt});}
  // A manual check is allowed once a minute. Automatic checks happen at most every six hours.
  if(Date.now()-lastCheck<(manual?60000:6*60*60*1000))return state;
  busy=true;lastCheck=Date.now();emit({status:'checking',error:null});
  try{
   const response=await fetcher(API,{headers:{Accept:'application/vnd.github+json','User-Agent':`Daymark/${app.getVersion()}`,'X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(20000)});
   if(response.status===404)return emit({status:'current',version:null,prompt:false});
   if(response.status===403||response.status===429)throw new Error('GitHub is limiting update checks. Please try again in an hour.');
   if(!response.ok)throw new Error(`Could not check for updates (${response.status}).`);
   release=selectRelease(await response.json(),app.getVersion(),platform,arch);
   return emit(release?{status:'available',version:release.version,notes:release.notes,prompt:manual||Date.now()>=settings.remindAt}:{status:'current',version:null,prompt:false});
  }catch(error){return emit({status:'error',error:error.message,prompt:false});}finally{busy=false;}
 }
 async function download(){
  if(busy||!release||!['available','error'].includes(state.status))return state;
  busy=true;emit({status:'downloading',prompt:true,error:null,percent:0,received:0,total:release.size});
  let last=0;
  try{downloadPath=await downloadVerified(release,path.join(directory(),release.version),progress=>{if(Date.now()-last>100||progress.received===progress.total){last=Date.now();emit(progress);}},fetcher);return emit({status:'ready',percent:100,prompt:true});}
  catch(error){return emit({status:'error',error:error.message,prompt:true});}finally{busy=false;}
 }
 async function install(){
  if(busy||state.status!=='ready'||!downloadPath)return state;
  busy=true;emit({status:'installing',prompt:true,error:null});
  try{
   await flush();
   // Re-hash immediately before execution, including across a long snooze.
   const {createHash}=require('node:crypto');const {createReadStream}=require('node:fs');const hash=createHash('sha256');for await(const chunk of createReadStream(downloadPath))hash.update(chunk);
   if(hash.digest('hex')!==release.sha256)throw new Error('The downloaded update changed. Please download it again.');
   const record=path.join(directory(),'install-result.json');
   const before=path.join(app.getPath('userData'),`daymark-before-update-${app.getVersion()}-${Date.now()}.json`);
   await fs.copyFile(path.join(app.getPath('userData'),'daymark.json'),before);
   const destination=process.platform==='darwin'?path.resolve(path.dirname(process.execPath),'../..'):path.dirname(process.execPath);
   await fs.access(path.dirname(destination),require('node:fs').constants.W_OK);
   const script=path.join(directory(),process.platform==='darwin'?'install-mac.sh':'install-windows.ps1');
   await fs.copyFile(path.join(__dirname,process.platform==='darwin'?'install-mac.sh':'install-windows.ps1'),script);
   const args=process.platform==='darwin'?[script,String(process.pid),downloadPath,destination,record,release.version]:['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-ParentProcess',String(process.pid),'-Installer',downloadPath,'-Destination',destination,'-ResultFile',record,'-Version',release.version];
   const child=spawn(process.platform==='darwin'?'/bin/bash':'powershell.exe',args,{detached:true,stdio:'ignore',windowsHide:true});
   await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
   quit();return state;
  }catch(error){busy=false;return emit({status:'error',error:`Could not install: ${error.message}`,prompt:true});}
 }
 async function defer(){settings.remindAt=Date.now()+24*60*60*1000;await preferences();return emit({prompt:false});}
 async function init(){
  try{settings=JSON.parse(await fs.readFile(settingsPath(),'utf8'));}catch{}
  try{const receipt=JSON.parse((await fs.readFile(path.join(directory(),'install-result.json'),'utf8')).replace(/^\uFEFF/,''));state.receipt=receipt.success?`Updated to Daymark ${receipt.version}.`:receipt.message;}catch{}
  if(supported()){const initial=setTimeout(()=>check(false),8000);initial.unref();const timer=setInterval(()=>check(false),60*60*1000);timer.unref();}
 }
 return {init,state:()=>state,check,download,install,defer,openReleases:async()=>{await openExternal(RELEASES);return state;}};
}
module.exports={createUpdater};
