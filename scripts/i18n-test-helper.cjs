// Match the browser script order in dependency-free VM regression checks.
const fs=require('fs'),path=require('path'),vm=require('vm');
module.exports=function(context){['i18n','en','pt'].forEach(name=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/i18n/'+name+'.js'),'utf8'),context));vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/ui-icons.js'),'utf8'),context);};
