import fs from 'fs';
let content = fs.readFileSync('src/routes/+page.svelte', 'utf8');

// I inserted too many </div> tags! Find the bottom boundary right above <!-- Dashboard Preview --> and strip any extra ones
content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<!-- Dashboard Preview -->/, '  </div>\n  </div>\n\n  <!-- Dashboard Preview -->');

fs.writeFileSync('src/routes/+page.svelte', content);
