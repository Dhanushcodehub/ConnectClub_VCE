const fs = require('fs');
const path = require('path');

const targetString = 'hover:bg-primary/10 hover:text-primary hover:border-primary hover:shadow-[0_0_15px_rgba(0,112,243,0.3)]';
const replacementString = 'hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]';

const files = [
  'c:/Users/dhanu/OneDrive/Desktop/Connect-Club/src/components/Navbar.tsx',
  'c:/Users/dhanu/OneDrive/Desktop/Connect-Club/src/components/home/CTA.tsx',
  'c:/Users/dhanu/OneDrive/Desktop/Connect-Club/src/components/home/FeaturedEvent.tsx',
  'c:/Users/dhanu/OneDrive/Desktop/Connect-Club/src/components/home/FeaturedProject.tsx',
  'c:/Users/dhanu/OneDrive/Desktop/Connect-Club/src/components/home/Hero.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(targetString)) {
    content = content.replaceAll(targetString, replacementString);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  } else {
    console.log('Skipped', file);
  }
}
