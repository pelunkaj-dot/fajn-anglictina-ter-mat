"""Extend the existing native SVG illustration system; no external images."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
out=root/'assets/situations'
out.mkdir(parents=True,exist_ok=True)
def svg(name,body):
    (out/f'{name}.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="25" fill="#fffaf0"/>'+body+'</svg>')
def person(name,x,y,scale=1):
    original=(root/f'assets/characters/{name}.svg').read_text()
    content=re.sub(r'^.*?<svg[^>]*>|</svg>\s*$','',original,flags=re.S)
    return f'<g transform="translate({x} {y}) scale({scale})">{content}</g>'
ball='<circle cx="160" cy="114" r="65" fill="#ec784a" stroke="#6d4134" stroke-width="4"/><path d="M101 88q59 36 119 0M100 140q60-40 120 0M160 50q-37 63 0 129M160 50q37 63 0 129" stroke="#ffedb5" stroke-width="8" fill="none"/>'
svg('ball',ball)
svg('teddy','<g fill="#b8783e" stroke="#6c482f" stroke-width="4"><circle cx="116" cy="56" r="22"/><circle cx="204" cy="56" r="22"/><ellipse cx="160" cy="135" rx="45" ry="54"/><ellipse cx="108" cy="140" rx="22" ry="34" transform="rotate(25 108 140)"/><ellipse cx="212" cy="140" rx="22" ry="34" transform="rotate(-25 212 140)"/><ellipse cx="129" cy="186" rx="27" ry="20"/><ellipse cx="191" cy="186" rx="27" ry="20"/><circle cx="160" cy="84" r="48"/></g><ellipse cx="160" cy="101" rx="24" ry="18" fill="#f7d4a0"/><circle cx="143" cy="80" r="5" fill="#332a23"/><circle cx="178" cy="80" r="5" fill="#332a23"/><path d="M153 98q7-8 14 0l-7 6Z" fill="#332a23"/><path d="M160 105v7m-9-1q9 9 18 0" stroke="#332a23" stroke-width="3" fill="none"/>')
svg('kite','<path d="M160 24l60 70-60 70-60-70Z" fill="#f5cb45" stroke="#546278" stroke-width="4"/><path d="M160 24v140M100 94h120" stroke="#546278" stroke-width="3"/><path d="M160 24l60 70h-60Z" fill="#f17878"/><path d="M160 94v70l-60-70Z" fill="#62b6d7"/><path d="M160 165q55 30 3 42" stroke="#546278" stroke-width="3" fill="none"/><path d="M168 175l-12-8 2 17Zm19 15 13-10-2 17Z" fill="#de7195"/>')
svg('blocks','<g stroke="#596478" stroke-width="4" stroke-linejoin="round"><path d="M80 153h65v51H80Z" fill="#ed796d"/><path d="M145 153h65v51h-65Z" fill="#64a7d7"/><path d="M112 101h65v52h-65Z" fill="#f7ce58"/><path d="M113 101l32-48 32 48Z" fill="#6cbc8a"/><path d="M218 165h45v39h-45Z" fill="#ac86cb"/></g>')
left=person('terezka',20,58,1.5)
right=person('matysek',180,58,1.5)
svg('hello',left+right+'<path d="M131 60q29-20 58 0" stroke="#77b686" stroke-width="6" fill="none"/><path d="M170 43l19 17-23 8" stroke="#77b686" stroke-width="6" fill="none"/><path d="M75 40v-15m-15 22-10-10m40 8 10-10M243 42V25m-17 22-10-10m43 11 10-10" stroke="#efbc4d" stroke-width="5" stroke-linecap="round"/>')
svg('goodbye',person('terezka',15,58,1.5)+person('matysek',180,58,1.5)+'<path d="M169 198h100l-17-16m17 16-17 16" stroke="#e3985c" stroke-width="6" fill="none"/><path d="M140 37q-30-26-62 0" stroke="#78b5d0" stroke-width="5" fill="none"/><path d="M247 15v25m14-13-14 13-14-13" stroke="#78b5d0" stroke-width="4" fill="none"/>')
svg('thanks',left+right+'<rect x="144" y="135" width="36" height="32" rx="4" fill="#7bbce0"/><path d="M162 136v30m-18-22h36" stroke="#ffe16e" stroke-width="6"/><path d="M148 42c-22-28-45 8 0 29 45-21 22-57 0-29Z" fill="#ed87a7"/>')
svg('please',left+right+'<circle cx="231" cy="180" r="20" fill="#f08d55"/><path d="M139 136h30m-10-10 10 10-10 10" stroke="#8095ad" stroke-width="5" fill="none"/><path d="M104 125q7-18 20-10l13 12-17 9" fill="#ffce9a" stroke="#ba8d6b" stroke-width="3"/>')
print('8 clear native SVG situations created')
def standing(name,x,y,shirt='#ee675f'):
    return f'<g><path d="M{x+26} {y+79}v60m28-60v60" stroke="#4573ac" stroke-width="18" stroke-linecap="round"/><path d="M{x+26} {y+138}h-15m43 0h15" stroke="#6a4b3b" stroke-width="10" stroke-linecap="round"/>'+person(name,x,y,1)+f'<path d="M{x+15} {y+58}l-17-33m62 33 19-28" stroke="#ffcea6" stroke-width="10" stroke-linecap="round"/></g>'
svg('hello','<path d="M0 193q100-40 320 0v27H0Z" fill="#c7e6a9"/><path d="M30 95V25m-20 36q-13-28 19-35 32 9 20 35Z" fill="#76bc7f"/>'+standing('terezka',65,50)+standing('matysek',185,50)+'<path d="M56 72l-13-8m14-9-9-13m108 29 12-10m-4-8 10-12" stroke="#edc349" stroke-width="5" stroke-linecap="round"/>')
svg('goodbye','<rect x="194" y="27" width="98" height="183" rx="7" fill="#cc986d"/><rect x="206" y="38" width="77" height="172" fill="#95cddb"/><circle cx="272" cy="126" r="5" fill="#ffcd55"/>'+standing('terezka',32,57)+standing('matysek',207,62)+'<path d="M91 92l19-27" stroke="#ffcea6" stroke-width="10" stroke-linecap="round"/><rect x="190" y="136" width="27" height="36" rx="5" fill="#7298c6"/><path d="M196 136v-8q9-9 16 0v8" stroke="#487099" stroke-width="4" fill="none"/>')
svg('thanks','<path d="M0 204h320" stroke="#d7cabc" stroke-width="7"/>'+standing('terezka',113,44)+'<rect x="127" y="130" width="64" height="47" rx="7" fill="#82bedc"/><path d="M159 130v47m-32-31h64" stroke="#ffe16e" stroke-width="9"/><path d="M157 121q-30-18-19-28 13-10 19 17 7-29 20-17 10 14-20 28" stroke="#e7b837" stroke-width="5" fill="none"/><path d="M230 57c-25-34-54 9 0 34 54-25 25-68 0-34Z" fill="#ec88a9"/>')
svg('please','<path d="M30 30h180v17H30Z M30 47v159m180-159v159" stroke="#ba9470" stroke-width="7"/><circle cx="94" cy="75" r="29" fill="#ef8b53"/><path d="M66 75h57m-29-29v58" stroke="#ffe1a6" stroke-width="4"/>'+standing('matysek',190,69)+'<path d="M201 130l-54-29m0 0-16-9m16 9-18 2" stroke="#ffcea6" stroke-width="10" stroke-linecap="round"/><path d="M117 125q30-14 49 7" stroke="#a8b8c8" stroke-width="4" fill="none"/>')
