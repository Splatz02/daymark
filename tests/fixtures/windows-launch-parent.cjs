const {launchWindowsInstaller}=require('../../electron/windows-launcher.cjs');
const [script,resultFile]=process.argv.slice(2);
launchWindowsInstaller({script,resultFile,installer:'unused.exe',destination:'unused',version:'1.2.0',userDataDirectory:'unused'})
 .then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});
