import fs from 'fs';
let content = fs.readFileSync('src/routes/+page.svelte', 'utf8');

// remove badge
content = content.replace(/<!-- NEW Announcement Badge -->[\s\S]*?<\/div>/, '');

fs.writeFileSync('src/routes/+page.svelte', content);
