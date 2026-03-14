import fs from 'fs';
let content = fs.readFileSync('src/routes/+page.svelte', 'utf8');

const generateImgTags = (files) => {
    let html = '';
    for(let i=0; i<3; i++) {
        files.forEach(file => {
            html += `              <img src="/gallery/${file}" class="h-57.5 w-auto aspect-video rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl shrink-0" alt=""/>\n`;
        });
    }
    html += '              <!-- Duplicated for seamless loop -->\n';
    for(let i=0; i<3; i++) {
        files.forEach(file => {
            html += `              <img src="/gallery/${file}" class="h-57.5 w-auto aspect-video rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl shrink-0" alt=""/>\n`;
        });
    }
    return html;
}

const row1Files = ['1.jpg', '2.jpg'];
const row2Files = ['3.jpg', '4.jpg'];

content = content.replace(/<div class="flex-1 flex flex-row gap-4 animate-marquee-right-fast w-max">[\s\S]*?<\/div>(\s*)<!-- Row 2/, `<div class="flex-1 flex flex-row gap-4 animate-marquee-right-fast w-max">\n${generateImgTags(row1Files)}          </div>$1<!-- Row 2`);

content = content.replace(/<div class="flex-1 flex flex-row gap-4 animate-marquee-right-slow w-max ml-\[-200px\]">[\s\S]*?<\/div>/, `<div class="flex-1 flex flex-row gap-4 animate-marquee-right-slow w-max -ml-50">\n${generateImgTags(row2Files)}          </div>`);

fs.writeFileSync('src/routes/+page.svelte', content);
