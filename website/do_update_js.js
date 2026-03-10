const fs = require('fs');
const p = 'c:/Users/User/Documents/Projects/Sonar-Code-Editor/website/src/routes/+page.svelte';
let s = fs.readFileSync(p, 'utf8');

// Update Meteor init logic
const oldInit = \init(resetToTop = false) {
// Origin around 50% horizontally, 30% from top
const originX = width * 0.5;
const originY = height * 0.3;

this.symbol = symbols[Math.floor(Math.random() * symbols.length)];
this.color = colors[Math.floor(Math.random() * colors.length)];
this.size = Math.random() * 6 + 12; // 12px to 18px
this.opacity = Math.random() * 0.03 + 0.07; // 0.07 to 0.10

this.speed = Math.random() * 1.2 + 0.3; // 0.3 to 1.5 speed

// Angle: 360 degrees outward from center
this.angle = Math.random() * Math.PI * 2;

if (resetToTop) {
this.x = originX;
this.y = originY;
} else {
// Disperse initially
let dist = Math.random() * Math.max(width, height);
this.x = originX + Math.cos(this.angle) * dist;
this.y = originY + Math.sin(this.angle) * dist;
}

this.history = [];
}\;

const newInit = \init(resetToTop = false) {
// Origin: Left edge of the screen
const originX = -50;
const originY = Math.random() * height;

this.symbol = symbols[Math.floor(Math.random() * symbols.length)];
this.color = colors[Math.floor(Math.random() * colors.length)];
this.size = Math.random() * 6 + 12; // 12px to 18px
this.opacity = Math.random() * 0.04 + 0.08; // 0.08 to 0.12

this.speed = Math.random() * 1.2 + 0.3; // 0.3 to 1.5 speed

// Angle: rightward or diagonally (-45 to +45 degrees)
this.angle = (Math.random() * 90 - 45) * (Math.PI / 180);

if (resetToTop) {
this.x = originX;
this.y = originY;
} else {
// Disperse initially across the screen width so it's not starting bare
this.x = Math.random() * width;
this.y = Math.random() * height;
}

this.history = [];
}\;

s = s.replace(oldInit, newInit);

// And update the check when moving out of bounds
const oldUpdate = \if (this.x < -100 || this.x > width + 100 || this.y < -100 || this.y > height + 100) {\;
const newUpdate = \if (this.x > width + 100 || this.y < -100 || this.y > height + 100) {\;
s = s.replace(oldUpdate, newUpdate);

fs.writeFileSync(p, s);
console.log("Updated JS!");
