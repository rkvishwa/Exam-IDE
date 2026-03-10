const fs = require('fs');
const p = 'c:/Users/User/Documents/Projects/Sonar-Code-Editor/website/src/routes/+page.svelte';
let s = fs.readFileSync(p, 'utf8');

const regex = /<div class="flex flex-col sm:flex-row items-center gap-3 hero-stagger-5">([\s\S]*?)<\/div>/;
const ms = s.match(regex);
if (ms) {
    let replaced = s.replace(regex, \<div class="flex flex-col sm:flex-row items-center gap-3 hero-stagger-5">
<a href="/download" class="shake-btn group w-full sm:w-auto px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-lg shadow-lg shadow-zinc-900/10 dark:shadow-white/10 flex items-center justify-center gap-2 text-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
<Download size={15} />
<span>Download for Windows</span>
</a>
<a href="/download-mac" class="shake-btn group w-full sm:w-auto px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-lg shadow-lg shadow-zinc-900/10 dark:shadow-white/10 flex items-center justify-center gap-2 text-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
<Download size={15} />
<span>Download for Mac</span>
</a>
<a href="/docs" class="shake-btn group w-full sm:w-auto px-6 py-2.5 bg-white/70 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.1] backdrop-blur-md text-zinc-700 dark:text-zinc-300 font-medium rounded-lg flex items-center justify-center gap-2 border border-zinc-200/80 dark:border-white/[0.08] text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-sm">
<span>Read Docs</span>
<ArrowRight size={14} class="opacity-50 group-hover:translate-x-0.5 transition-transform" />
</a>
</div>\);
    s = replaced;
} else {
    console.log("Not found");
}

let addedStyle = s.replace('</style>', \\\t@keyframes shake {
0%, 100% { transform: translateX(0); }
15% { transform: translateX(-4px); }
30% { transform: translateX(4px); }
45% { transform: translateX(-3px); }
60% { transform: translateX(3px); }
75% { transform: translateX(-2px); }
90% { transform: translateX(2px); }
}
.shake-btn:hover {
animation: shake 0.4s ease;
}
</style>\);

fs.writeFileSync(p, addedStyle);
console.log("Success");
