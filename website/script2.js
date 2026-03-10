import fs from 'fs';
let content = fs.readFileSync('src/routes/+page.svelte', 'utf8');

// replace Right Column block
const oldRightColumnRegex = /<!-- Right Column -->[\s\S]*?<\/div>\s*<\/div>/;

const newRightColumn = `<!-- Right Column -->
  <div class="hidden lg:block w-1/2 relative h-[500px] overflow-hidden rounded-xl" style="mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);">
      <!-- the two rows layout -->
      <div class="absolute inset-0 flex flex-col gap-4 h-full w-full">
          <!-- Row 1 -->
          <div class="flex-1 flex flex-row gap-4 animate-marquee-right-fast w-max">
              <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <!-- Duplicated for seamless loop -->
              <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
          </div>
          <!-- Row 2 (staggered) -->
          <div class="flex-1 flex flex-row gap-4 animate-marquee-right-slow w-max ml-[-200px]">
              <img src="https://images.unsplash.com/photo-1627398240449-04f56f345ae8?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1550439062-609e1531270e?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1627398240449-04f56f345ae8?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1550439062-609e1531270e?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <!-- Duplicated for seamless loop -->
              <img src="https://images.unsplash.com/photo-1627398240449-04f56f345ae8?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1550439062-609e1531270e?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1627398240449-04f56f345ae8?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
              <img src="https://images.unsplash.com/photo-1550439062-609e1531270e?q=80&w=800&auto=format&fit=crop" class="h-full w-[350px] rounded-xl object-cover border border-white/5 opacity-80 shadow-2xl flex-shrink-0" alt=""/>
          </div>
      </div>
  </div>`;

content = content.replace(oldRightColumnRegex, newRightColumn);

// replace CSS keyframes
content = content.replace(/@keyframes marqueeUp[\s\S]*?\.animate-marquee-up-slow[\s\S]*?\}/, `@keyframes marqueeRight {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0%); }
}
.animate-marquee-right-fast {
  animation: marqueeRight 35s linear infinite;
}
.animate-marquee-right-slow {
  animation: marqueeRight 45s linear infinite;
}`);

fs.writeFileSync('src/routes/+page.svelte', content);
