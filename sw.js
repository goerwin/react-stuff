if(!self.define){let e,i={};const c=(c,n)=>(c=new URL(c+".js",n).href,i[c]||new Promise((i=>{if("document"in self){const e=document.createElement("script");e.src=c,e.onload=i,document.head.appendChild(e)}else e=c,importScripts(c),i()})).then((()=>{let e=i[c];if(!e)throw new Error(`Module ${c} didn’t register its module`);return e})));self.define=(n,s)=>{const r=e||("document"in self?document.currentScript.src:"")||location.href;if(i[r])return;let o={};const f=e=>c(e,r),t={module:{uri:r},exports:o,require:f};i[r]=Promise.all(n.map((e=>t[e]||f(e)))).then((e=>(s(...e),o)))}}define(["./workbox-7cfec069"],(function(e){"use strict";self.addEventListener("message",(e=>{e.data&&"SKIP_WAITING"===e.data.type&&self.skipWaiting()})),e.precacheAndRoute([{url:"assets/index-HRhxw3ia.js",revision:"0b02f689cc12f7eba2031720b45034bc"},{url:"assets/index-UnoirJaK.css",revision:"a69a4a45dd400ecae9109f64b0dd53b8"},{url:"index.html",revision:"287020273f23901c5bf10380cd1fecb4"},{url:"registerSW.js",revision:"42346a55211aaf20b89e943c7fcb5c6e"},{url:"icon-chicken/web/icon-192.png",revision:"27865433c92df6f6047bb556c31dd4c2"},{url:"icon-chicken/web/icon-512.png",revision:"f9aba0dc9f1c553d48f353fc81de5db1"},{url:"icon-chicken/web/icon-512-maskable.png",revision:"f8f237cae7b0d1e859ae33f31297c8bb"},{url:"manifest.webmanifest",revision:"9012676b9a982e8bb7980fcac65da204"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))}));
