/* DashPoint game skin roster — unlock rules mirror the source file names */
window.DashPointSkins = [
  { id: 1, name: "Cube", src: "assets/skins/skin-1.png" },
  { id: 2, name: "Plus", src: "assets/skins/skin-2.png" },
  { id: 3, name: "Blank", src: "assets/skins/skin-3.png" },
  { id: 4, name: "Arrow", src: "assets/skins/skin-4.png" },
  { id: 5, name: "Bob", src: "assets/skins/skin-5.png" },
  { id: 6, name: "Happy Circle", src: "assets/skins/skin-6.png", hint: "Die 20 times", unlock: { type: "deaths", n: 20 } },
  { id: 7, name: "Mess", src: "assets/skins/skin-7.png", hint: "Die 5 times", unlock: { type: "deaths", n: 5 } },
  { id: 8, name: "Modern Art Be Like", src: "assets/skins/skin-8.png", hint: "Die for the first time", unlock: { type: "deaths", n: 1 } },
  { id: 9, name: "TLTN", src: "assets/skins/skin-9.png", hint: "Beat any level", unlock: { type: "beat" } },
  { id: 10, name: "Triangle", src: "assets/skins/skin-10.png", hint: "Die 40 times", unlock: { type: "deaths", n: 40 } },
  { id: 11, name: "TRUEBOBSKIN", src: "assets/skins/skin-11.png", hint: "Press Alt+A in this menu", unlock: { type: "secreta" } },
  { id: 12, name: "Goofy", src: "assets/skins/skin-12.png", hint: "Die 100 times", unlock: { type: "deaths", n: 100 } },
  { id: 13, name: "Triple T", src: "assets/skins/skin-13.png", hint: "Die 1000 times", unlock: { type: "deaths", n: 1000 } },
  { id: 14, name: "Gucci Morty", src: "assets/skins/skin-14.png", hint: "Jump 100 times", unlock: { type: "jumps", n: 100 } },
  { id: 15, name: "please touch grass", src: "assets/skins/skin-15.png", hint: "Jump 5000 times or die 4000 times", unlock: { type: "either", jumps: 5000, deaths: 4000 } },
];
