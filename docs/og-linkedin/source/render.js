const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{const [src,out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:627}});
for(const f of fs.readdirSync(src).filter(f=>f.endsWith('.html'))){await p.goto('file://'+path.join(src,f));await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:path.join(out,f.replace('.html','.png'))});console.log(f)}
await b.close()})();
