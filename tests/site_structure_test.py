from html.parser import HTMLParser
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
html=(root/"index.html").read_text()
css=(root/"style.css").read_text()
js=(root/"app.js").read_text()

class Audit(HTMLParser):
 def __init__(self):
  super().__init__();self.ids=set();self.duplicate=set();self.anchors=[];self.external_links=[];self.elements={}
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if "id" in d:
   if d["id"] in self.ids:self.duplicate.add(d["id"])
   self.ids.add(d["id"])
  if tag=="a":
   href=d.get("href","")
   if href.startswith("#"):self.anchors.append(href[1:])
   if href.startswith("http"):self.external_links.append((href,d.get("target"),d.get("rel","")))
  self.elements[tag]=self.elements.get(tag,0)+1

a=Audit();a.feed(html)
errors=[]
def check(cond,msg):
 if not cond:errors.append(msg)
check(not a.duplicate,"duplicate IDs: "+str(a.duplicate))
check(not set(a.anchors)-a.ids,"broken anchor IDs: "+str(set(a.anchors)-a.ids))
check(a.elements.get("article",0)>=14,"expected offer + portfolio cards")
check(html.count('class="project-card"')==11,"expected 11 featured cards")
check(html.count("class=\"ai-stage\"")==4,"expected 4 verified-workflow stages")
check(all(x in a.ids for x in ['main','intelligence','portfolio','start','lead-form','form-status','ownership']),"missing core sections")
check(all(not (t=="_blank" and "noopener" not in rel) for _,t,rel in a.external_links),"external link opener leak")
check('name="consent" required' in html and 'name="company_fax"' in html,"consent or honeypot missing")
check(".project-card[hidden]" in css and "prefers-reduced-motion" in css,"missing filter or accessibility styling")
check("aria-pressed" in html and "aria-live" in html,"accessible interactions not declared")
check("confirmationSent" in (root/"api/briefing.js").read_text(),"server lacks confirmation accounting")
check("More than a website" in html and "We start with what your business needs" in html,"positioning copy missing")
check('No purchase or deposit until we agree on the scope' in html,"scope-first terms missing")
print("STATIC_SITE_QA",{"ids":len(a.ids),"articles":a.elements.get("article",0),"featured":html.count('class="project-card"'),"internal_links":len(a.anchors),"external_links":len(a.external_links),"errors":errors})
raise SystemExit(bool(errors))
