import fs from 'fs';
let content = fs.readFileSync('src/routes/+page.svelte', 'utf8');

// Replace Unsplash Row 1 images with user's gallery images
content = content.replace(/<div class="flex-1 flex flex-row gap-4 animate-marquee-right-fast w-max">[\s\S]*?<\/div>\s*<!-- Row 2/, `<div class="flex-1 flex flex-row gap-4 animate-marquee-right-fast w-max">
              <img src="/gallery/1.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/2.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/3.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/4.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <!-- Duplicated for seamless loop -->
              <img src="/gallery/1.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/2.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/3.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/4.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
          </div>
          <!-- Row 2`);

// Replace Unsplash Row 2 images with user's gallery images 
content = content.replace(/<div class="flex-1 flex flex-row gap-4 animate-marquee-right-slow w-max ml-\[-200px\]">[\s\S]*?<\/div>/, `<div class="flex-1 flex flex-row gap-4 animate-marquee-right-slow w-max ml-[-200px]">
              <img src="/gallery/5.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/6.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/7.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/1.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <!-- Duplicated for seamless loop -->
              <img src="/gallery/5.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/6.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/7.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="/gallery/1.jpg" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
          </div>`);

fs.writeFileSync('src/routes/+page.svelte', content);
