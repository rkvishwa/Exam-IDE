import fs from 'fs';
let content = fs.readFileSync('src/routes/+page.svelte', 'utf8');

// Replace standard flex gap with consistent grid heights 
// Using aspect-video and relative auto heights for more flex block security
content = content.replace(/h-full w-\[350px\] rounded-xl object-cover/g, 'h-57.5 w-auto aspect-video rounded-xl object-cover');

fs.writeFileSync('src/routes/+page.svelte', content);
