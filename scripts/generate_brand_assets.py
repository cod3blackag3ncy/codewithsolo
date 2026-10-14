from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from math import hypot
ROOT=Path(__file__).resolve().parent.parent
BG=(16,23,19); LIME=(194,252,131); WHITE=(239,246,236); MUTED=(166,188,168)
fontpaths=[
 '/system/fonts/Roboto-Bold.ttf',
 '/system/fonts/Roboto-Regular.ttf',
 '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
]
def font(size,bold=True):
 for p in (fontpaths if bold else fontpaths[1:]+fontpaths[:1]):
  if Path(p).exists():return ImageFont.truetype(p,size)
 return ImageFont.load_default()
def icon(size):
 im=Image.new('RGB',(size,size),BG);d=ImageDraw.Draw(im)
 m=int(size*.105);d.rounded_rectangle((m,m,size-m,size-m),radius=int(size*.20),fill=LIME)
 # Flat C3 monogram with offset optical center.
 f=font(int(size*.31))
 text='C3';box=d.textbbox((0,0),text,font=f,stroke_width=0)
 w=box[2]-box[0];h=box[3]-box[1]
 d.text(((size-w)//2-int(size*.02),(size-h)//2-box[1]),text,font=f,fill=BG)
 d.rounded_rectangle((int(size*.39),int(size*.77),int(size*.64),int(size*.79)),radius=int(size*.008),fill=BG)
 return im
for size in (192,512):
 icon(size).save(ROOT/'icons'/f'icon-{size}.png',optimize=True)
img=Image.new('RGB',(1200,630),BG);d=ImageDraw.Draw(img)
# Restrained editorial grid; atmospheric off-axis intelligence graph.
for y in range(630):
 amt=y/629
 c=tuple(int(BG[i]*(1-amt)+(21,38,27)[i]*amt) for i in range(3))
 d.line((0,y,1200,y),fill=c)
for i in range(10):
 x=810+i*39;y=40+i*49
 d.ellipse((x-170,y-170,x+170,y+170),outline=(44+i*3,74+i*5,47+i*3),width=2)
nodes=[(830,170),(1050,255),(940,400),(1110,475),(760,520)]
for i,(x,y) in enumerate(nodes):
 for x2,y2 in nodes[i+1:]:
  if hypot(x2-x,y2-y)<295:d.line((x,y,x2,y2),fill=(90,123,84),width=2)
 d.ellipse((x-8,y-8,x+8,y+8),fill=LIME)
 d.ellipse((x-18,y-18,x+18,y+18),outline=(95,143,77),width=2)
d.rounded_rectangle((73,68,130,125),radius=13,fill=LIME)
d.text((84,78),'C3',fill=BG,font=font(22))
d.text((149,77),'CODEWITHSOLO',font=font(25),fill=WHITE)
d.text((150,109),'BY COD3BLACKAGENCY',font=font(13),fill=MUTED,spacing=5)
d.text((72,203),'MORE THAN',font=font(66),fill=WHITE)
d.text((72,279),'A WEBSITE.',font=font(66),fill=WHITE)
d.text((72,363),'A WAY FOR YOUR',font=font(43),fill=LIME)
d.text((72,416),'BUSINESS TO WORK.',font=font(43),fill=LIME)
d.line((72,527,715,527),fill=(72,108,75),width=2)
d.text((72,549),'WEBSITES   /   SYSTEMS   /   DIRECTED AI   /   VERIFICATION',font=font(17),fill=MUTED)
img.save(ROOT/'social-card.png',optimize=True)
(ROOT/'icons'/'favicon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="16" fill="#101713"/>
<rect x="7" y="7" width="50" height="50" rx="13" fill="#c2fc83"/>
<text x="32" y="41" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="23" font-weight="900" letter-spacing="-2" fill="#101713">C3</text>
</svg>''')
print('ASSETS',[(str(p.relative_to(ROOT)),p.stat().st_size) for p in [ROOT/'social-card.png',ROOT/'icons/icon-192.png',ROOT/'icons/icon-512.png',ROOT/'icons/favicon.svg']])
