import { WatchDecoder, createSession } from '@aerotrack/protocols';
const d = new WatchDecoder(); const s = createSession();
const enc = new TextEncoder();
const frames = [
  '[3G*863589071234567*0002*LK]',
  '[3G*863589071234567*008C*UD,081126,183615,A,-17.829220,S,31.054120,E,12.4,90,1550,8,92,78,0,0,00000000,1,648,04,9529,21850,4]',
  '[3G*863589071234567*0090*UD,081126,183715,V,-17.830000,S,31.055000,E,0.0,0,0,0,92,78,0,0,00000000,3,648,04,9529,21850,648,04,9529,21900,648,04,9530,1810]',
  '[3G*863589071234567*0002*AL]',
];
for (const f of frames) console.log(JSON.stringify(d.decode(enc.encode(f), s)).slice(0, 500));
