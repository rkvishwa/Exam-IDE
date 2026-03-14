import fs from 'fs';
let content = fs.readFileSync('src/routes/+page.svelte', 'utf8');

// 1. Fix hero section background
content = content.replace(/min-h-screen bg-\[#050508\]/, 'min-h-screen bg-[#fafafa] dark:bg-[#050508]');

// 2. Fix radial fade mask background
content = content.replace(/<div class="absolute inset-0 z-0 pointer-events-none" style="background: radial-gradient\(circle at top, transparent 20%, #050508 80%\);"><\/div>/, `<div class="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_top,transparent_20%,#fafafa_80%)] dark:bg-[radial-gradient(circle_at_top,transparent_20%,#050508_80%)]"></div>`);

// 3. Fix h1 text color
content = content.replace(/text-white mb-5 hero-stagger-3"/, 'text-zinc-900 dark:text-white mb-5 hero-stagger-3"');

// 4. Update image row generation
const generateImages = (files) => {
    let html = '';
    // 3 repetitions
    for(let i=0; i<3; i++) {
        files.forEach((file) => {
            html += `              <img src="/gallery/${file}" class="h-57.5 w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl shrink-0" alt=""/>\n`;
        });
    }
    html += '              <!-- Duplicated for seamless loop -->\n';
    for(let i=0; i<3; i++) {
        files.forEach((file) => {
            html += `              <img src="/gallery/${file}" class="h-57.5 w-auto aspect-video rounded-xl object-cover border border-zinc-200 dark:border-white/5 opacity-80 shadow-2xl shrink-0" alt=""/>\n`;
        });
    }
    return html;
};

// Dark Mode Files
const darkRow1 = ['1.jpg', '2.jpg'];
const darkRow2 = ['3.jpg', '4.jpg'];

// Light Mode Files
const lightRow1 = ['5.jpg', '6.jpg'];
const lightRow2 = ['7.jpg', '5.jpg']; // Cycle back to 5 for padding

const generateLayout = (r1, r2, classes) => `      <div class="absolute inset-0 flex-col gap-4 h-full w-full ${classes}">
          <!-- Row 1 -->
          <div class="flex-1 flex flex-row gap-4 animate-marquee-right-fast w-max">
${generateImages(r1)}          </div>
          <!-- Row 2 (staggered) -->
          <div class="flex-1 flex flex-row gap-4 animate-marquee-right-slow w-max -ml-50">
${generateImages(r2)}          </div>
      </div>`;

const newRightColumnHTML = `<!-- Right Column -->
    <div class="hidden lg:block w-1/2 relative h-125 overflow-hidden rounded-xl" style="mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);">
      <!-- Dark mode images -->
${generateLayout(darkRow1, darkRow2, 'hidden dark:flex')}
      <!-- Light mode images -->
${generateLayout(lightRow1, lightRow2, 'flex dark:hidden')}
    </div>`;

// Regex replace Right Column
content = content.replace(/<!-- Right Column -->[\s\S]*?<\/div>\s*<\/div>/, newRightColumnHTML + '\n  </div>');

fs.writeFileSync('src/routes/+page.svelte', content);
