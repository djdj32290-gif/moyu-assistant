const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'src/background.js'),'utf8');
// Run the shipped helper against a delayed API that rejects duplicate IDs.
const helper=source.slice(source.indexOf('const contentRegistrations'),source.indexOf('const snapshots'));
const checks=[],errors=[],scripts=new Map();let registrations=0,updates=0,fail=false;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const scripting={getRegisteredContentScripts:async({ids})=>{await pause(10);return ids.filter(id=>scripts.has(id)).map(id=>({id}));},registerContentScripts:async items=>{registrations++;await pause(20);if(fail)throw Error('permission denied');for(const item of items){if(scripts.has(item.id))throw Error('Duplicate script ID');scripts.set(item.id,item);}},updateContentScripts:async items=>{updates++;await pause(10);for(const item of items)assert(scripts.has(item.id));}};
const context=vm.createContext({chrome:{scripting},scriptId:x=>'point-resize-'+x,FILES:['content.js'],Map});vm.runInContext(helper+';globalThis.ensure=ensureContentScript;',context);
(async()=>{try{
 await Promise.all(Array.from({length:30},()=>context.ensure('https://example.test/*')));assert.equal(registrations,1);assert.equal(scripts.size,1);checks.push('Thirty overlapping navigation/focus/open requests register one content-script ID');
 await context.ensure('https://example.test/*');assert.equal(registrations,1);assert.equal(updates,1);checks.push('An existing persistent registration updates its source list without duplicate registration');
 fail=true;await assert.rejects(context.ensure('https://retry.test/*'),/permission denied/);fail=false;await context.ensure('https://retry.test/*');assert(scripts.has('point-resize-https://retry.test/*'));checks.push('Real API errors propagate and a later request can retry without a stuck in-flight registration');
 await Promise.all([context.ensure('https://first.test/*'),context.ensure('https://second.test/*')]);assert(scripts.has('point-resize-https://first.test/*')&&scripts.has('point-resize-https://second.test/*'));checks.push('Different website patterns retain independent registration and permissions');
 for(const check of checks)console.log('PASS',check);
}catch(e){errors.push(e.stack);console.error(e);process.exitCode=1;}finally{fs.writeFileSync(path.join(__dirname,'registration-verification.json'),JSON.stringify({version:'0.18.5',checks,errors,scope:'Actual bundled registration helper exercised with delayed duplicate-rejecting browser API; real browser integration is covered by the sequential desktop suites.'},null,2));console.log('RESULT',checks.length,'errors',errors.length);}})();
