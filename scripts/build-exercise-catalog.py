"""Build source catalogue variants and 24 cropped atlases from VossFit-Galerie-24-Raster.zip."""
import csv,io,json,re,sys,zipfile
from pathlib import Path
from collections import OrderedDict
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'assets/exercises';out.mkdir(parents=True,exist_ok=True)
z=zipfile.ZipFile(sys.argv[1]);rows=list(csv.DictReader(io.StringIO(z.read('Zuordnung.csv').decode('utf-8-sig'))))
tail={551:'triceps_dumbbell_overhead_extension_seated_single_arm',553:'triceps_bench_dumbbell_tate_press_lying',555:'triceps_bench_ezbar_french_press_lying',557:'triceps_bench_ezbar_french_press_lying_close_underhand_grip',559:'triceps_bench_ezbar_french_press_decline',561:'triceps_bench_ezbar_french_press_incline',563:'triceps_ezbar_overhead_extension_seated',565:'triceps_cable_bench_french_press_incline',567:'triceps_cable_overhead_extension_kneeling_v_grip',569:'triceps_cable_concentration_extension_kneeling_single_arm',571:'triceps_cable_overhead_extension_standing_bent_over_rope',573:'triceps_cable_pushdown_standing_rope',575:'triceps_cable_pushdown_standing_underhand_v_grip',577:'triceps_cable_pushdown_standing_overhand_v_grip',579:'triceps_cable_bench_french_press_lying',581:'triceps_cable_kickbacks_bent_over',583:'triceps_cable_overhead_extension_standing_rope',585:'triceps_machine_elbow_extension_seated',587:'triceps_machine_dips_seated',589:'triceps_push_ups_close_grip',591:'triceps_smith_machine_press_lying_close_grip',593:'triceps_smith_machine_press_decline_close_grip',595:'triceps_smith_machine_press_incline_close_grip'}
rows.append(dict(Nummer='550',Originaldatei=rows[-1]['Originaldatei'].replace('_1.png','_2.png')))
for n,slug in tail.items():
 for phase in (1,2):rows.append(dict(Nummer=str(n+phase-1),Originaldatei=f'images/{slug}_{phase}.png'))
groups=OrderedDict()
for row in rows:groups.setdefault(re.sub(r'_[12]\.png$','',row['Originaldatei'][7:]),[]).append(int(row['Nummer']))
MUSCLES={'abs':'Bauch','aerobic':'Bauch','biceps':'Bizeps','calves':'Waden','cardio':'Cardio & Sport','chest':'Brust','forearm':'Unterarme','gluteus':'Gesäß','hamstrings':'Beinbeuger','lat':'Rücken','lower':'Unterer Rücken','quads':'Beine','shoulders':'Schultern','traps':'Nacken','triceps':'Trizeps'}
SPORTS=dict(zip('crosstrainer|ergometer_lying|ergometer_seated|rower|stationary_cycling|stepper|treadmill|badminton|baseball|basketball|bb|biking|boxing|climbing|cross_country_skiing|cross_skiing|cross_snowboarding|fighting|football|hiking|inline_skaten|jogging|motocross|nordic_walking|paddling|rowing|soccer|squash|swimming|table_tennis|tennis|volleyball'.split('|'),'Crosstrainer|Liegeergometer|Fahrradergometer|Ruderergometer|Indoor-Cycling|Stepper|Laufband|Badminton|Baseball|Basketball|Krafttraining allgemein|Radfahren|Boxen|Klettern|Skilanglauf|Skifahren|Snowboarden|Kampfsport|American Football|Wandern|Inlineskaten|Joggen|Motocross|Nordic Walking|Paddeln|Rudern auf dem Wasser|Fußball|Squash|Schwimmen|Tischtennis|Tennis|Volleyball'.split('|')))
FAMILIES=[('handstand','Handstand-Liegestütze'),('tate_press','Tate Press'),('overhead','Überkopf-Trizepsstrecken'),('french_press','French Press'),('concentration_extension','Konzentrations-Trizepsstrecken'),('elbow_extension','Trizepsstrecken'),('pushdown','Trizepsdrücken'),('knee_raise','Knieheben'),('roller','Ab-Rollout'),('side_bend','Seitbeugen'),('twist_torso','Rumpfrotation'),('supported_side_crunch','Seitlicher Crunch mit Unterstützung'),('supported_crunch','Crunch mit Unterstützung'),('side_crunch','Seitlicher Crunch'),('reverse_crunch','Reverse Crunch'),('cycle_twist_crunch','Bicycle Crunch mit Rotation'),('cycle_crunch','Bicycle Crunch'),('crunch','Crunch'),('heel_touchers','Fersenberühren'),('flatter_kick','Flutter Kicks'),('jackknife','Klappmesser'),('leg_pullin','Beine anziehen'),('leg_raise','Beinheben'),('pelvic_lift','Beckenheben'),('planks','Plank'),('side_hip_raise','Seitliches Beckenheben'),('twist_situp','Sit-up mit Rotation'),('situp','Sit-up'),('toe_touchers','Zehenberühren'),('aerobic_abs','Bauch-Aerobic'),('pullups','Klimmzüge'),('battle_ropes','Battle Ropes'),('wrist_curl','Handgelenkcurls'),('reverse_curl','Reverse Curls'),('hand_squeeze','Griffkrafttraining'),('zottman','Zottman Curls'),('concentration_curl','Konzentrationscurls'),('hammer_curl','Hammercurls'),('crossbody_hammer','Crossbody-Hammercurls'),('crossbody_curl','Crossbody-Curls'),('curl','Bizepscurls'),('reverse_rocking','Schienbeinheben'),('rocking','Wadenheben'),('dips','Dips'),('landmine','Landmine Press'),('floor_press','Floor Press'),('hex_press','Hex Press'),('around_world','Around the World'),('reverse_flys','Reverse Flys'),('flys','Flys'),('butterfly','Butterfly'),('pullover','Überzüge'),('crossover','Cable Crossover'),('svend','Svend Press'),('push_ups','Liegestütze'),('hip_thrust','Hip Thrust'),('hip_extension','Hüftstrecken'),('leg_kickbacks','Glute Kickbacks'),('kroc_rows','Kroc Rows'),('tipup','T-Bar-Rudern'),('upright_row','Aufrechtes Rudern'),('row','Rudern'),('pulldown','Latzug'),('good_mornings','Good Mornings'),('sumo_deadlift','Sumo-Kreuzheben'),('deadlift','Kreuzheben'),('hyperextensions','Rückenstrecken'),('back_curls','Rückenstrecken'),('cat_stretch','Katzenbuckel'),('front_squats','Frontkniebeugen'),('hack_squats','Hackenschmidt-Kniebeugen'),('goblet','Goblet Squat'),('squats','Kniebeugen'),('lunges','Ausfallschritte'),('step_ups','Step-ups'),('abduction','Hüftabduktion'),('adduction','Hüftadduktion'),('leg_extension','Beinstrecken'),('leg_press','Beinpresse'),('leg_side_raise','Seitliches Beinheben'),('front_raise','Frontheben'),('arnold','Arnold Press'),('lateral_raise','Seitheben'),('turkish_getup','Turkish Get-up'),('shrugs','Schulterheben'),('y_raise','Y-Raises'),('kickbacks','Trizeps-Kickbacks')]
QUALIFIERS=[('alternate','alternierend'),('single_arm','einarmig'),('both_arms','beidarmig'),('scott','Scottbank'),('behind_back','hinter dem Rücken'),('bent_over','vorgebeugt'),('decline','Negativbank'),('incline','schräg'),('hanging','hängend'),('rest_on_arms','im Stütz'),('kneeling','kniend'),('seated','sitzend'),('lying','liegend'),('standing','stehend'),('close_grip','enger Griff'),('medium_grip','mittlerer Griff'),('wide_grip','weiter Griff'),('underhand','Untergriff'),('overhand','Obergriff'),('hammer_grip','Neutralgriff'),('close_feet','enger Stand'),('wide_feet','weiter Stand'),('wide_legs','weiter Stand'),('raised_legs','Beine erhöht'),('bent_legs','Beine angewinkelt'),('clapping','mit Klatschen'),('supported','unterstützt'),('neck','zum Nacken'),('rope','Seilgriff'),('robe','Seilgriff'),('v_grip','V-Griff'),('twist_in','mit Eindrehung')]
TIPS={'Bankdrücken':['Stabil auf der Bank liegen und Füße sicher abstellen.','Gewicht kontrolliert absenken und gleichmäßig hochdrücken.'],'Klimmzüge':['Griff und Schulterposition kontrolliert einnehmen.','Ohne Schwung hochziehen und langsam wieder absenken.'],'Rudern':['Rumpf stabil halten und den Griff kontrolliert zum Körper ziehen.','Die Arme langsam wieder strecken; nicht aus dem Rücken reißen.'],'Latzug':['Sitz und Polster einstellen, Rumpf stabil halten.','Griff kontrolliert ziehen und langsam zurückführen.'],'Kniebeugen':['Stabilen Stand einnehmen und den Rumpf anspannen.','Knie in Richtung der Zehen führen; kontrolliert absenken und aufrichten.'],'Bizepscurls':['Oberarme möglichst ruhig halten.','Ellenbogen beugen und das Gewicht langsam absenken, ohne Schwung zu holen.'],'Trizepsdrücken':['Oberarme am Rumpf stabilisieren.','Ellenbogen strecken und den Griff langsam wieder anheben.'],'Überkopf-Trizepsstrecken':['Rumpf stabil halten, Oberarme in einer angenehmen Überkopfposition.','Ellenbogen kontrolliert beugen und strecken.'],'French Press':['Oberarme in einer stabilen Position halten.','Gewicht durch Beugen und Strecken der Ellenbogen kontrolliert bewegen.'],'Seitheben':['Rumpf ruhig halten und Ellenbogen leicht beugen.','Arme kontrolliert seitlich anheben und langsam absenken.'],'Wadenheben':['Fußballen stabil aufsetzen und Gleichgewicht sichern.','Fersen kontrolliert anheben und wieder absenken.'],'Beinbeugen':['Gerät und Polster passend einstellen.','Knie gegen den Widerstand beugen und langsam wieder strecken.'],'Beinstrecken':['Sitz und Polster passend einstellen.','Knie kontrolliert strecken und das Gewicht langsam absenken.'],'Flys':['Ellenbogen leicht gebeugt halten.','Arme kontrolliert öffnen und wieder zusammenführen.'],'Hip Thrust':['Oberen Rücken stabil abstützen und Füße sicher aufstellen.','Hüfte anheben, ohne den unteren Rücken zu überstrecken.'],'Kreuzheben':['Last nah am Körper führen und den Rumpf stabilisieren.','Hüfte und Knie kontrolliert strecken und die Last kontrolliert absetzen.'],'Plank':['Unterarme und Füße stabil abstützen.','Rumpf angespannt halten und ruhig weiteratmen.']}
entries=[]
for slug,nums in groups.items():
 n=nums[0];cardio=slug.startswith('cardio');muscle=MUSCLES[slug.split('_')[0]]
 if cardio:fam=SPORTS[slug.split('_',2)[2]];eq='Cardiogerät' if '_gym_' in slug else 'Sport';vs=[]
 else:
  fam={425:'Good Mornings',267:'Lat-Pushdown',172:'Schienbeinheben'}.get(n)
  if not fam:
   for key,name in FAMILIES:
    if key in slug and (key!='overhead' or slug.startswith('triceps')):
     fam='Beinbeugen' if key=='curl' and slug.startswith('hamstrings') else name;break
  if not fam:fam='Schulterdrücken' if slug.startswith('shoulders') else 'Bankdrücken'
  eq=next((label for key,label in [('battle_ropes','Battle Ropes'),('smith_machine','Smith-Maschine'),('cable','Kabelzug'),('dumbbell','Kurzhanteln'),('ezbar','SZ-Stange'),('barbell','Langhantel'),('kettlebell','Kettlebell'),('plate','Hantelscheibe'),('machine','Maschine')] if key in slug),'Körpergewicht')
  vs=list(dict.fromkeys(label for key,label in QUALIFIERS if key in slug));vs=['stehend'] if n==425 else vs
 if n in (50,339,341,343,345,347,449,455,467):muscle='Gesäß'
 if n in (413,427,439,453):muscle='Hintere Kette'
 if n in (451,457):muscle='Adduktoren'
 if n==172:muscle='Schienbein'
 if n==267:muscle='Rücken'
 if fam in ('Reverse Flys','Y-Raises'):muscle='Schultern'
 if n==130:muscle='Ganzkörper';cardio=True
 secondary=[]
 if fam in ('Bankdrücken','Floor Press','Liegestütze','Dips','Hex Press','Landmine Press'):secondary=['Trizeps','Vordere Schulter'] if muscle=='Brust' else ['Brust','Vordere Schulter']
 elif fam in ('Rudern','Klimmzüge','Latzug'):secondary=['Bizeps','Unterarme'] if muscle!='Bizeps' else ['Rücken','Unterarme']
 elif fam in ('Kniebeugen','Frontkniebeugen','Beinpresse','Ausfallschritte','Step-ups','Goblet Squat'):secondary=['Gesäß','Rumpf']
 elif fam in ('Schulterdrücken','Arnold Press','Handstand-Liegestütze'):secondary=['Trizeps']
 name=fam+(' · '+eq if eq not in ('Körpergewicht','Sport','Cardiogerät') else '')+(' · '+', '.join(vs) if vs else '')
 tips=TIPS.get(fam,['Gerät bzw. Ausgangsposition passend einstellen.','Bewegung ruhig und kontrolliert in einem angenehmen Bewegungsumfang ausführen.'])
 if cardio:tips=['Dauer und Intensität passend wählen.','Kontrolliert beginnen und Belastung schrittweise anpassen.']
 entries.append(dict(id='vf-'+slug,name=name,family=fam,muscle=muscle,secondary=secondary,equipment=eq,variants=vs,kind='cardio' if cardio else 'strength',frames=nums,tips=tips,review='draft',source='csv' if n<550 else 'caption',aliases=[slug.replace('_',' ')]))
entries.extend(json.loads((out/'extra-exercises.json').read_text()) if (out/'extra-exercises.json').exists() else [])
(out/'catalog.js').write_text('window.VF_EXERCISE_CATALOG = '+json.dumps(entries,ensure_ascii=False,separators=(',',':'))+';\n')
with (out/'mapping.csv').open('w',newline='') as f:
 w=csv.writer(f,lineterminator="\n");w.writerow(['Nummer','Übungs-ID','Phase','Zuordnungsquelle'])
 for e in entries:
  for i,n in enumerate(e['frames']):w.writerow([n,e['id'],i+1,'Generiert' if isinstance(n,str) else 'Original-CSV' if n<=549 else 'Bildbeschriftung (rekonstruiert)'])
for sheet in range(1,25):
 im=Image.open(z.open(f'VossFit-Raster-{sheet:02}.png')).convert('RGB');w,h=im.size
 def bounds(axis):
  span=h if axis==0 else w;length=w if axis==0 else h;hits=[]
  for a in range(length):
   count=sum(1 for b in range(0,span,8) if (lambda p:p[2]>155 and p[0]<65 and p[1]<90)(im.getpixel((a,b) if axis==0 else (b,a))))
   if count>span/8*.83:hits.append(a)
  clusters=[]
  for p in hits:
   if not clusters or p-clusters[-1][-1]>3:clusters.append([p])
   else:clusters[-1].append(p)
  result=[round(sum(c)/len(c)) for c in clusters]
  return result if len(result)==6 else [round(i*length/5) for i in range(6)]
 xs,ys=bounds(0),bounds(1);atlas=Image.new('RGB',(1250,1150),'black')
 for k in range(25):
  if (sheet-1)*25+k+1>596:continue
  x,y=k%5,k//5;l,r=xs[x]+4,xs[x+1]-4;t,b=ys[y]+3,ys[y+1]-3;label=b-30
  for py in range(max(t,b-52),b-10):
   pix=[px for px in range(l,r) if (lambda p:min(p)>150 and max(p)-min(p)<50)(im.getpixel((px,py)))]
   if len(pix)>20 and max(pix)-min(pix)>(r-l)*.5:label=py-3;break
  tile=im.crop((l,t,r,label));tile.thumbnail((244,224),Image.Resampling.LANCZOS);atlas.paste(tile,(x*250+(250-tile.width)//2,y*230+(230-tile.height)//2))
 atlas.save(out/f'atlas-{sheet:02}.webp','WEBP',quality=84,method=6)
(out/'source-notes.txt').write_bytes(z.read('Offene-Korrekturen.txt'))
print(len(entries),'variants',sum(len(e['frames']) for e in entries),'frames')
