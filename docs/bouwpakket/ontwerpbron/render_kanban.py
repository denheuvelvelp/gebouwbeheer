from pathlib import Path
import json,subprocess,textwrap
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
import fitz
O=Path(__file__).resolve().parent.parent; ms=json.loads((O/'modules.json').read_text())
for n,f in [('UI','DejaVu Sans'),('UIB','DejaVu Sans:style=Bold')]:pdfmetrics.registerFont(TTFont(n,subprocess.check_output(['fc-match','-f','%{file}',f],text=True)))
W,H=1440,1000
nav=['Dashboard','Storingen','Gebouwen en objecten','Meters en WhatsApp','Contacten en berichten','Onderhoud en planning','Vereniging en financiën','Veiligheid en middelen','Personeel','AI en beheer']
def rect(c,x,y,w,h,fill='#ffffff',stroke=None,r=12):
 c.setFillColor(HexColor(fill));c.setStrokeColor(HexColor(stroke or fill));c.roundRect(x,H-y-h,w,h,r,fill=1,stroke=bool(stroke))
def text(c,x,y,s,size=14,color='#173249',bold=False,maxw=None):
 c.setFont('UIB' if bold else 'UI',size);c.setFillColor(HexColor(color))
 if maxw:
  while pdfmetrics.stringWidth(s,'UIB' if bold else 'UI',size)>maxw:s=s[:-2]+'…' if not s.endswith('…') else s[:-2]+'…'
 c.drawString(x,H-y-size,s)
def lines(c,x,y,s,width=90,size=14,color='#173249',bold=False):
 for i,line in enumerate(textwrap.wrap(s,width=width)):text(c,x,y+i*(size+7),line,size,color,bold)
def btn(c,x,y,s,w=160,ghost=False):
 rect(c,x,y,w,42,'#ffffff' if ghost else '#087e8b','#dce5ec' if ghost else None,8);text(c,x+16,y+12,s,12,'#526b7c' if ghost else '#ffffff',True,maxw=w-24)
def badge(c,x,y,s):
 w=min(170,max(65,pdfmetrics.stringWidth(s,'UI',10)+20));rect(c,x,y,w,27,'#e8f3f5',None,6);text(c,x+9,y+7,s,10,'#176a77',maxw=w-15)
def field(c,x,y,w,label,value='Selecteer of vul in'):
 text(c,x,y,label,11,'#526b7c',True,maxw=w);rect(c,x,y+23,w,45,'#fbfcfe','#d9e3eb',7);text(c,x+12,y+38,value,12,'#8395a3',maxw=w-22)

def render(m):
 p=Path('tmp/denheuvel')/(m['id']+'.pdf');c=canvas.Canvas(str(p),pagesize=(W,H));rect(c,0,0,W,H,'#f3f6fa',r=0);rect(c,0,0,225,H,'#102f46',r=0)
 text(c,28,28,'DEN HEUVEL',23,'#ffffff',True);text(c,29,66,'GEBOUWBEHEER',10,'#80a2b9');text(c,29,123,'WERKPLEK',10,'#7391a6',True)
 for i,n in enumerate(nav):
  active=(n=='Storingen' and m['id']=='storingen') or n==m['title'] or (n=='AI en beheer' and m['id'] in ['assistent','beheer'])
  if active:rect(c,15,153+i*52,195,45,'#1a5065',r=8)
  text(c,29,166+i*52,n,12,'#ffffff' if active else '#b9ccd9',active,maxw=175)
 text(c,28,920,'Google Workspace',12,'#b9ccd9');text(c,28,946,'Ontwerpomgeving  v2.0',10,'#80a2b9')
 rect(c,258,22,430,43,'#ffffff','#dfe7ee',8);text(c,274,36,'Zoek een melding, locatie of contact…',12,'#8496a4');text(c,1200,30,'Huismeester',12,bold=True);text(c,1200,51,'Den Heuvel',10,'#7b8e9e');rect(c,1330,22,46,46,'#d7e9ec',r=23);text(c,1340,37,'HM',12,'#236477',True)
 badge(c,260,91,'SCHERMONTWERP');text(c,414,99,'Voorgesteld: beheer.denheuvelvelp.nl / '+m['id'],11,'#788c9a')
 text(c,260,141,m['title'],29,bold=True,maxw=790);text(c,260,188,'Registreren, controleren en opvolgen vanuit één werkplek',13,'#718494')
 btn(c,1220,151,'+ Nieuw',155)
 nums=['3','2','1'];labs=['Open registraties','In behandeling','Controle nodig']
 if m['id']=='storingen':nums=['12','5','2'];labs=['Open meldingen','In uitvoering','Termijn verstreken']
 if m['id']=='meters':nums=['10','7','3'];labs=['Meters in proefronde','Bevestigd','Nog opnemen']
 if m['id']=='verlof':nums=['96 uur','24 uur','1'];labs=['Beschikbaar voorbeeldsaldo','Gereserveerd','Aanvraag te beoordelen']
 for i,(num,lab) in enumerate(zip(nums,labs)):
  x=260+i*377;rect(c,x,227,359,120,'#ffffff','#e0e8ee');text(c,x+22,246,lab,12,'#718494');text(c,x+22,273,num,29,bold=True);text(c,x+22,318,'Fictief voorbeeld · geen live gegevens',10,'#698976')
 rect(c,260,371,772,388,'#ffffff','#e0e8ee');text(c,281,391,'Overzicht',17,bold=True);badge(c,281,431,'Alle registraties');badge(c,421,431,'Gebouw: alle');badge(c,551,431,'Status: alle')
 ty=486
 if m['kind']=='chart':
  rect(c,281,477,730,105,'#f5f9fb',r=8)
  for j,v in enumerate([35,58,46,75,51,63]):rect(c,315+j*110,568-v,55,v,'#76b0b8',r=3);text(c,315+j*110,570,str(2027+j),10,'#7691a1')
  ty=603
 if m['kind']=='meter':
  rect(c,281,477,730,85,'#eef3f6',r=8);text(c,305,492,'Herkenningsvoorstel',11,'#718494');text(c,305,512,'12345,678 m³',25,bold=True);text(c,580,510,'Nog te bevestigen',13,'#a17030');ty=584
 if m['kind']=='chat':
  rect(c,281,477,730,87,'#e8f4f3',r=8);text(c,300,491,'Voorbeeldvraag',11,'#4e7b83',True);text(c,300,515,'Kan ik mijn eigen meterstand opvragen?',16);text(c,300,541,'Antwoord via gecontroleerde bron en toegangscontrole.',10,'#6b8791');ty=584
 # Compact exact text table in panel; adjusted row heights when extra visual present.
 cw=[210,210,160,150];sx=281
 rect(c,sx,ty,730,33,'#f5f8fa',r=0)
 for j,col in enumerate(m['cols']):text(c,sx+sum(cw[:j])+8,ty+11,col.upper(),9,'#718494',True,maxw=cw[j]-12)
 rowh=40 if ty>500 else 61
 for ri,row in enumerate(m['rows']):
  yy=ty+33+ri*rowh
  for j,val in enumerate(row):text(c,sx+sum(cw[:j])+8,yy+12,val,10.5,maxw=cw[j]-16)
  c.setStrokeColor(HexColor('#edf1f5'));c.line(sx,H-yy-rowh,sx+730,H-yy-rowh)
 rect(c,1054,371,321,529,'#ffffff','#e0e8ee');text(c,1075,393,'Registratie invoeren',17,bold=True)
 for j,f in enumerate(m['form']):field(c,1075,439+j*89,279,f)
 btn(c,1075,807,'Opslaan',279);text(c,1075,868,'Annuleren  ·  Terug',11,'#7e919f')
 rect(c,260,782,772,118,'#ffffff','#e0e8ee');text(c,281,802,'Opvolging en historie',16,bold=True);text(c,281,839,'Controleer de invoer voordat je opslaat.',12);text(c,281,865,'Wijzigingen krijgen een gebruiker, datum en versienummer.',11,'#718494')
 text(c,260,933,'Ontwerp met fictieve gegevens. Knoppen en koppelingen zijn nog niet actief.',11,'#8598a6');text(c,260,962,'Google Sheets  +  Drive  +  Apps Script  |  Formulieren voor alle invoer',10,'#8598a6')
 c.save();doc=fitz.open(p);doc[0].get_pixmap(matrix=fitz.Matrix(1.2,1.2),alpha=False).save(O/'screens'/(m['id']+'.png'));doc.close()
import tempfile
p=Path(tempfile.gettempdir())/'denheuvel-kanban-board.pdf';c=canvas.Canvas(str(p),pagesize=(1440,1000));rect(c,0,0,1440,1000,'#f3f6fa',r=0);rect(c,0,0,225,1000,'#102f46',r=0)
text(c,28,28,'DEN HEUVEL',23,'#ffffff',True);text(c,29,66,'GEBOUWBEHEER',10,'#80a2b9')
for i,n in enumerate(['Dashboard','Actielijst','Storingen','Gebouwen en objecten','Meters en WhatsApp','Contacten en berichten','Onderhoud en planning','Vereniging en financiën','Veiligheid en middelen','Personeel','AI en beheer']):
 if n=='Actielijst':rect(c,15,135+i*51,195,44,'#1a5065',r=8)
 text(c,29,149+i*51,n,12,'#ffffff' if n=='Actielijst' else '#b9ccd9',n=='Actielijst',maxw=175)
rect(c,260,23,430,43,'#ffffff','#dfe7ee',8);text(c,277,36,'Zoek een actie, verantwoordelijke of label…',12,'#8295a2');text(c,1210,34,'Huismeester',13,bold=True);badge(c,260,91,'SCHERMONTWERP');text(c,415,99,'Voorgesteld: beheer.denheuvelvelp.nl / beheer / acties',11,'#7b8f9d')
text(c,260,142,'Actielijst',30,bold=True);text(c,260,188,'Samen plannen en opvolgen met een overzichtelijk Kanban-bord',13,'#718494');btn(c,1215,151,'+ Nieuwe actie',160)
badge(c,260,229,'Alle acties');badge(c,380,229,'Mijn acties');badge(c,500,229,'Eigenaar: alle');badge(c,645,229,'Prioriteit: alle');badge(c,800,229,'Deadline: alle')
columns=[('Te doen','2',[('Entree Noord controleren','Hoog','02 nov','Huismeester 1','Inspectie'),('Labelvoorraad aanvullen','Normaal','05 nov','Huismeester 2','Voorraad')]),('In uitvoering','2',[('Werkprocedure bijwerken','Normaal','04 nov','Huismeester 1','Veiligheid'),('Leverancier terugbellen','Hoog','03 nov','Huismeester 2','Onderhoud')]),('Wacht','1',[('Offerte deuronderhoud','Normaal','06 nov','Bestuur','Wacht op leverancier')]),('Gereed','1',[('Ronde West afronden','Normaal','24 okt','Huismeester 2','Afgerond')])]
for i,(title,count,cards) in enumerate(columns):
 x=260+i*281;rect(c,x,285,263,490,'#eaf0f5',r=11);text(c,x+17,303,title,15,bold=True);badge(c,x+212,299,count)
 for j,(title,prio,deadline,owner,label) in enumerate(cards):
  y=347+j*192;rect(c,x+11,y,241,176,'#ffffff','#dce5ec',9);text(c,x+24,y+14,'···',15,'#7b8f9d');lines(c,x+24,y+39,title,width=24,size=13,bold=True);badge(c,x+24,y+91,label);text(c,x+24,y+130,owner,10,'#5f7d8d');text(c,x+24,y+151,deadline+' · '+prio,10,'#9e6419' if prio=='Hoog' else '#718494')
rect(c,260,798,1106,112,'#ffffff','#dfe7ee',11);text(c,280,816,'Actie openen of toevoegen',15,bold=True);text(c,280,849,'Titel · omschrijving · eigenaar · prioriteit · deadline · labels · checklist · bijlagen',12);text(c,280,875,'Versleep een kaart of gebruik Verplaats naar. Iedere wijziging wordt gecontroleerd opgeslagen.',11,'#718494')
text(c,260,943,'Fictieve voorbeeldacties. Schermontwerp, geen bestaande app.',11,'#8195a4');c.save();d=fitz.open(p);d[0].get_pixmap(matrix=fitz.Matrix(1.2,1.2),alpha=False).save(O/'screens/kanban.png');d.close();print('Kanban-schermontwerp gereed')
