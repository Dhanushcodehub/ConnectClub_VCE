const fs = require('fs');

const files = [
  'c:/Users/dhanu/OneDrive/Desktop/Connect-Club/src/components/Navbar.tsx',
  'c:/Users/dhanu/OneDrive/Desktop/Connect-Club/src/components/home/CTA.tsx',
  'c:/Users/dhanu/OneDrive/Desktop/Connect-Club/src/components/home/FeaturedEvent.tsx',
  'c:/Users/dhanu/OneDrive/Desktop/Connect-Club/src/components/home/FeaturedProject.tsx',
  'c:/Users/dhanu/OneDrive/Desktop/Connect-Club/src/components/home/Hero.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // We want to replace:
  // transition-all border bg-gradient-to-r from-primary/80 to-secondary/80 text-white border-white/20 hover:from-transparent hover:to-transparent hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]
  // with:
  // btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]
  
  const regex = /transition-all border bg-gradient-to-r from-primary\/80 to-secondary\/80 text-white border-white\/20 hover:from-transparent hover:to-transparent hover:bg-white\/10 hover:text-white hover:border-white\/40 hover:shadow-\[0_0_15px_rgba\(255,255,255,0\.4\)\]/g;
  
  if (content.match(regex)) {
    content = content.replace(regex, "btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]");
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  } else {
    console.log('Skipped', file);
  }
}
