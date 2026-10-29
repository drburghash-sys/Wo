/* خطوتي — جميع البيانات محلية على جهاز المستخدم. لا توجد اتصالات خلفية ببيانات صحية. */
(() => {
'use strict';
const KEY='khatwati_data_v1';
const IDB_NAME='khatwati-private-device-v1';
const IDB_STORE='settings';
const defaults=()=>({version:1,_savedAt:0,profile:null,customCalories:null,plan:'moderate',goalDays:30,goalStart:'',goalStartWeight:0,exerciseIntensity:'moderate',waterGoal:2200,minutesGoal:30,logs:[],weights:[],adjustment:'',settings:{dark:false,reminders:false,frequency:3,quietStart:'23:00',quietEnd:'07:00',lastReminder:''}});
let state=defaults();
try { const raw=localStorage.getItem(KEY); if(raw)state=validateData(JSON.parse(raw)); }catch(e){console.warn('تعذر استعادة الحفظ المحلي',e)}
const $=(id)=>document.getElementById(id);
const today=()=>{let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const format=(v)=>Math.round(v).toLocaleString('ar-SA');
const round50=(n)=>Math.round(n/50)*50;
const n=(x,fallback=0)=>Number.isFinite(+x)?+x:fallback;
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const id=()=>globalThis.crypto?.randomUUID?.()||`e${Date.now()}${Math.floor(Math.random()*10000)}`;
const escapeHTML=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plans={easy:{label:'الهادئة',minDeficit:.10,maxDeficit:.17,mins:20},moderate:{label:'المتوسطة',minDeficit:.16,maxDeficit:.25,mins:30},fast:{label:'المكثفة',minDeficit:.21,maxDeficit:.30,mins:40}};
const durationLabels={14:'أسبوعين',30:'شهر',60:'شهرين'};
const MAX_DAILY_DEFICIT=750; // سقف محافظ للحاسبة العامة؛ ليست وصفة علاجية
const workoutTemplates={
 moderate:[
  ['مشي سريع',30,'ابدأ بخمس دقائق إحماء، ثم امشِ بسرعة تسمح بالكلام.'],
  ['تمارين مقاومة',25,'قرفصاء للكرسي، دفع للحائط، سحب بحبل مقاومة؛ 1–2 مجموعة من 8–12 تكرارًا حسب القدرة.'],
  ['مشي سريع',30,'مشي بوتيرة مريحة مع إحماء وتهدئة.'],
  ['مشي أو راحة نشطة',20,'تحرك براحة دون إجهاد.'],
  ['مشي سريع',30,'مشي بوتيرة متوسطة؛ خفف الشدة إذا شعرت بالتعب.'],
  ['تمارين مقاومة',25,'تمارين للأرجل والظهر والصدر والذراعين مع راحة بين المجموعات.'],
  ['مشي سريع',30,'أكمل المشي أو قسمه إلى فترتين خلال اليوم.']
 ],
 vigorous:[
  ['جري خفيف أو دراجة قوية',25,'إحماء 5 دقائق، مجهود قوي متدرج، ثم تهدئة. لا تتدرب بأقصى جهد.'],
  ['تمارين مقاومة',25,'مقاومة متدرجة لكامل الجسم؛ 2 مجموعات × 8–12 تكرارًا إن كنت معتادًا.'],
  ['مشي سريع',30,'تعافٍ نشط بمجهود متوسط.'],
  ['جري خفيف أو دراجة قوية',25,'مجهود قوي يمكن تحمله مع فترات استراحة حسب الحاجة.'],
  ['تمارين مقاومة',25,'مقاومة لكامل الجسم مع الحرص على التقنية والراحة.'],
  ['جري خفيف أو دراجة قوية',25,'جولة ثالثة من النشاط الهوائي القوي دون منافسة أو إجهاد زائد.'],
  ['راحة أو تمشية خفيفة',15,'يوم استشفاء، ولا تحتاج إلى تعويض الحرق.']
 ]
};
const foodCatalog=[
 ['rice','أرز أبيض مطبوخ','100 جم',130],['kabsa','كبسة رز ودجاج','طبق متوسط (300 جم)',530],['brownrice','أرز بني مطبوخ','100 جم',111],['chicken','صدر دجاج مشوي','100 جم',165],['meat','لحم بقري مطبوخ قليل الدهن','100 جم',217],['fish','سمك مشوي','100 جم',128],['salmon','سلمون مطبوخ','100 جم',206],['egg','بيضة مسلوقة','حبة كبيرة',78],['egg2','بيض مقلي','حبة متوسطة',95],['bread','خبز عربي أبيض','رغيف صغير (60 جم)',165],['toast','توست أسمر','شريحة',75],['oats','شوفان جاف','40 جم',155],['milk','حليب قليل الدسم','كوب 240 مل',105],['yogurt','زبادي سادة','علبة 170 جم',110],['greek','زبادي يوناني سادة','170 جم',100],['cheese','جبن أبيض','30 جم',80],['dates','تمر','حبة متوسطة',23],['apple','تفاح','حبة متوسطة',95],['banana','موز','حبة متوسطة',105],['orange','برتقال','حبة متوسطة',62],['salad','سلطة خضراء دون تتبيلة','طبق 200 جم',45],['cucumber','خيار','100 جم',15],['tomato','طماطم','100 جم',18],['lentils','عدس مطبوخ','100 جم',116],['hummus','حمص بالطحينة','100 جم',166],['foul','فول مدمس دون زيت','100 جم',110],['oliveoil','زيت زيتون','ملعقة طعام',119],['nuts','مكسرات غير مملحة','30 جم',180],['coffee','قهوة سوداء دون سكر','كوب',3],['latte','لاتيه بحليب دون سكر','كوب 240 مل',125],['juice','عصير برتقال','كوب 240 مل',112],['cola','مشروب غازي عادي','علبة 330 مل',139],['samosa','سمبوسة مقلية','حبة متوسطة',130],['shawarma','شاورما دجاج','ساندويتش متوسط',450],['burger','برجر لحم','ساندويتش متوسط',450],['potato','بطاطس مسلوقة','100 جم',87],['fries','بطاطس مقلية','100 جم',312],['chocolate','شوكولاتة بالحليب','25 جم',135],['icecream','آيس كريم','نصف كوب',140]
].map(([id,name,unit,kcal])=>({id,name,unit,kcal}));
const activities=[['slowwalk','مشي هادئ',2.8],['walk','مشي متوسط',3.8],['brisk','مشي سريع',4.8],['run','جري خفيف',7],['run2','جري متوسط',9.8],['cycle','دراجة بوتيرة متوسطة',6],['swim','سباحة ترفيهية',6],['strength','تمارين مقاومة متوسطة',3.5],['home','تمارين منزلية خفيفة',3],['football','كرة قدم ترفيهية',7],['stairs','صعود الدرج',8]].map(([id,name,met])=>({id,name,met}));
function currentWeight(){return [...state.weights].sort((a,b)=>a.date.localeCompare(b.date)).at(-1)?.value??state.profile?.weight??0}
function bmi(w){const h=state.profile.height/100;return w/(h*h)}
function flagged(){return state.profile?.health?.length>0}
function qualifiesFast(){return state.profile&&bmi(currentWeight())>=27&&state.profile.age<65&&!flagged()}
function qualifiesVigorous(){return !!state.profile&&state.profile.age<60&&!flagged()&&state.profile.activity>=1.55&&bmi(currentWeight())<35;}
function dateDiff(a,b){const d=x=>{const [y,m,day]=x.split('-').map(Number);return Date.UTC(y,m-1,day)};return Math.round((d(b)-d(a))/86400000);}
function timeline(){const days=[14,30,60].includes(state.goalDays)?state.goalDays:30;const elapsed=state.goalStart?Math.max(0,dateDiff(state.goalStart,today())):0;const remain=Math.max(0,days-elapsed);return {days,elapsed,remain,week:Math.min(Math.ceil(days/7),Math.floor(elapsed/7)+1)};}
function calculate(weight=currentWeight(),plan=state.plan){
 if(!state.profile)return null;
 const p=state.profile,rmr=10*weight+6.25*p.height-5*p.age+(p.sex==='male'?5:-161),tdee=Math.max(0,rmr*p.activity);
 const atGoal=weight<=p.target,floor=p.sex==='male'?1500:1200,selected=plans[plan]||plans.moderate,period=timeline();
 // 7700 كيلوسعرة لكل كجم تقريب مبسط للطاقة، لا يتنبأ بدقة بنزول الوزن.
 const baseline=Math.max(weight,n(state.goalStartWeight,weight));
 const desiredLoss=Math.max(0,baseline-p.target);
 const desiredDaily=period.days?desiredLoss*7700/period.days:0;
 const maxDeficit=Math.min(MAX_DAILY_DEFICIT,tdee*selected.maxDeficit,weight*0.01*7700/7);
 const requestedDeficit=clamp(desiredDaily,tdee*selected.minDeficit,maxDeficit);
 const noDeficit=!atGoal&&(tdee<=floor||maxDeficit<100);
 const raw=atGoal?tdee:noDeficit?tdee:Math.max(floor,tdee-requestedDeficit);
 const automatic=atGoal?round50(tdee):Math.min(Math.floor(tdee/50)*50,Math.max(Math.ceil(floor/50)*50,round50(raw)));
 const manual=Number.isInteger(state.customCalories)&&state.customCalories>0;
 const calories=manual?state.customCalories:automatic;
 const deficit=Math.max(0,Math.round(tdee-calories));
 const safeLoss=Math.max(0,Math.min(desiredLoss,deficit*period.days/7700));
 const requiredWeekly=period.days?desiredLoss*7/period.days:0;
 const notFeasible=!atGoal&&desiredLoss>0.05&&(requiredWeekly>Math.min(0.9,weight*0.01)||desiredDaily>Math.min(MAX_DAILY_DEFICIT,tdee*selected.maxDeficit,tdee-floor)+40);
 return {rmr:Math.round(rmr),tdee:Math.round(tdee),calories,deficit,manual,weeklyLoss:Math.max(0,deficit*7/7700),atGoal,noDeficit,floor,period,desiredLoss,safeLoss,requiredWeekly,notFeasible};
}
// بيانات المستخدم محفوظة على الجهاز فقط: localStorage + IndexedDB. لا ترسل إلى GitHub أو أي خادم.
function openPrivateDB(){
 return new Promise(resolve=>{
  if(!('indexedDB' in window))return resolve(null);
  let settled=false;
  const finish=v=>{if(!settled){settled=true;clearTimeout(timer);resolve(v)}};
  const timer=setTimeout(()=>finish(null),2300);
  try{
   const request=indexedDB.open(IDB_NAME,1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(IDB_STORE))request.result.createObjectStore(IDB_STORE)};
   request.onsuccess=()=>{if(settled){request.result.close();return}finish(request.result)};
   request.onerror=()=>finish(null);request.onblocked=()=>finish(null);
  }catch(e){finish(null)}
 });
}
async function readIndexed(){
 const db=await openPrivateDB();if(!db)return null;
 return new Promise(resolve=>{try{
  const tx=db.transaction(IDB_STORE,'readonly'),r=tx.objectStore(IDB_STORE).get(KEY);
  r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null);
  tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();resolve(null)}
 }catch(e){db.close();resolve(null)}});
}
async function writeIndexed(serialized){
 const db=await openPrivateDB();if(!db)return false;
 return new Promise(resolve=>{let complete=false;try{
  const tx=db.transaction(IDB_STORE,'readwrite');
  tx.objectStore(IDB_STORE).put(serialized,KEY);
  tx.oncomplete=()=>{complete=true;db.close();resolve(true)};
  tx.onerror=tx.onabort=()=>{if(!complete){db.close();resolve(false)}};
 }catch(e){db.close();resolve(false)}});
}
async function clearIndexed(){
 const db=await openPrivateDB();if(!db)return;
 return new Promise(resolve=>{try{
  const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).delete(KEY);
  tx.oncomplete=tx.onerror=tx.onabort=()=>{db.close();resolve()};
 }catch(e){db.close();resolve()}});
}
async function restoreState(){
 const candidates=[];
 if(state.profile)candidates.push(state);
 try{const raw=localStorage.getItem(KEY);if(raw)candidates.push(validateData(JSON.parse(raw)))}catch(e){console.warn('Local backup unavailable',e)}
 try{const raw=await readIndexed();if(raw)candidates.push(validateData(JSON.parse(raw)))}catch(e){console.warn('Indexed backup unavailable',e)}
 const available=candidates.filter(x=>x.profile).sort((a,b)=>(b._savedAt||0)-(a._savedAt||0));
 if(available.length){state=available[0];await save();}
}
let writeQueue=Promise.resolve(true);
function save(){
 state._savedAt=Date.now();
 const snapshot=JSON.stringify(state);
 let localOK=false;
 try{localStorage.setItem(KEY,snapshot);localOK=localStorage.getItem(KEY)===snapshot}catch(e){console.warn('localStorage unavailable',e)}
 writeQueue=writeQueue.catch(()=>false).then(()=>writeIndexed(snapshot)).then(dbOK=>{
  if(!localOK&&!dbOK){try{toast('تنبيه: لم تُحفظ البيانات على الجهاز؛ احفظ نسخة احتياطية وتأكد من وضع المتصفح')}catch(e){}}
  return localOK||dbOK;
 });
 return writeQueue;
}
function validateCalorieChoice(raw,p,weight){
 if(raw===null||raw===undefined||String(raw).trim()==='')return {value:null,message:''};
 const val=Number(raw);
 if(!Number.isInteger(val)||val<1||val>6000)return {value:null,message:'أدخل هدف سعرات صحيحًا بين 1 و6000.'};
 const tdee=(10*weight+6.25*p.height-5*p.age+(p.sex==='male'?5:-161))*p.activity;
 const floor=p.sex==='male'?1500:1200;
 const maxLossDeficit=Math.min(750,tdee*.30,weight*.01*7700/7);
 const minAllowed=Math.max(floor,Math.ceil((tdee-maxLossDeficit)/50)*50);
 if(val<minAllowed)return {value:null,message:`هدف ${val} سعرة منخفض جدًا حسب بياناتك. الحد الأدنى المبدئي لهذا المسار ${Math.ceil(minAllowed)} سعرة. للمستويات الأدنى استشر مختصًا.`};
 return {value:val,message:''};
}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>el.classList.remove('show'),3100)}
function validateData(obj){if(!obj||typeof obj!=='object'||obj.version!==1)throw Error('صيغة النسخة غير مدعومة');const s=defaults();const p=obj.profile;if(p){if(!['male','female'].includes(p.sex)||n(p.age)<18||n(p.age)>100||n(p.height)<120||n(p.height)>230||n(p.weight)<30||n(p.weight)>400||n(p.target)<30||n(p.target)>350||n(p.target)>=n(p.weight)||bmiFor(n(p.height),n(p.target))<18.5||bmiFor(n(p.height),n(p.weight))<25)throw Error('بيانات المستخدم غير صالحة');s.profile={age:n(p.age),sex:p.sex,height:n(p.height),weight:n(p.weight),target:n(p.target),activity:[1.2,1.375,1.55,1.725].includes(n(p.activity))?n(p.activity):1.2,health:Array.isArray(p.health)?p.health.filter(x=>['pregnancy','eating','medical','other'].includes(x)).slice(0,4):[]};}
 s._savedAt=Math.max(0,n(obj._savedAt,0));s.customCalories=Number.isInteger(obj.customCalories)&&obj.customCalories>0&&obj.customCalories<=6000?obj.customCalories:null;s.plan=plans[obj.plan]?obj.plan:'moderate';s.goalDays=[14,30,60].includes(n(obj.goalDays))?n(obj.goalDays):30;s.goalStart=/^\d{4}-\d{2}-\d{2}$/.test(String(obj.goalStart||''))?obj.goalStart:today();s.goalStartWeight=n(obj.goalStartWeight)>0?n(obj.goalStartWeight):(s.profile?.weight||0);s.exerciseIntensity=obj.exerciseIntensity==='vigorous'?'vigorous':'moderate';s.waterGoal=clamp(n(obj.waterGoal,2200),500,6000);s.minutesGoal=clamp(n(obj.minutesGoal,30),5,180);
 s.logs=Array.isArray(obj.logs)?obj.logs.slice(-6000).filter(x=>x&&['water','food','exercise'].includes(x.type)&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))&&n(x.amount)>=0&&n(x.amount)<=10000).map(x=>({id:String(x.id||id()).slice(0,60),date:String(x.date),type:x.type,label:String(x.label||'').slice(0,90),amount:n(x.amount),calories:clamp(n(x.calories),0,5000),minutes:clamp(n(x.minutes),0,300),time:n(x.time,Date.now())})):[];
 s.weights=Array.isArray(obj.weights)?obj.weights.slice(-500).filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))&&n(x.value)>=30&&n(x.value)<=400).map(x=>({id:String(x.id||id()).slice(0,60),date:String(x.date),value:n(x.value)})):[];
 const st=obj.settings||{};s.settings={dark:!!st.dark,reminders:!!st.reminders,frequency:[2,3].includes(n(st.frequency))?n(st.frequency):3,quietStart:/^\d{2}:\d{2}$/.test(st.quietStart)?st.quietStart:'23:00',quietEnd:/^\d{2}:\d{2}$/.test(st.quietEnd)?st.quietEnd:'07:00',lastReminder:String(st.lastReminder||'').slice(0,60)};s.adjustment=String(obj.adjustment||'').slice(0,280);
 if(s.profile&&(s.profile.health.includes('pregnancy')||s.profile.health.includes('eating')||bmiFor(s.profile.height,s.profile.weight)<18.5))throw Error('النسخة تحتوي ملفًا خارج نطاق الاستخدام العام الآمن');
 if(s.profile&&s.plan==='fast'&&(s.profile.health.length||bmiFor(s.profile.height,s.profile.weight)<27))s.plan='moderate';if(s.profile&&s.exerciseIntensity==='vigorous'&&(s.profile.age>=60||s.profile.health.length||s.profile.activity<1.55||bmiFor(s.profile.height,s.profile.weight)>=35))s.exerciseIntensity='moderate';return s;
}
function bmiFor(h,w){return w/((h/100)**2)}
function logOf(type,date=today()){return state.logs.filter(x=>x.date===date&&(!type||x.type===type))}
function totals(date=today()){let logs=logOf(null,date);return {water:logs.filter(l=>l.type==='water').reduce((s,l)=>s+l.amount,0),food:logs.filter(l=>l.type==='food').reduce((s,l)=>s+l.calories,0),minutes:logs.filter(l=>l.type==='exercise').reduce((s,l)=>s+l.minutes,0),burned:logs.filter(l=>l.type==='exercise').reduce((s,l)=>s+l.calories,0)};}
function addLog(log){state.logs.push({id:id(),date:today(),time:Date.now(),...log});save();render();toast('تم التسجيل ✓')}
function deleteLog(entry){state.logs=state.logs.filter(x=>x.id!==entry);save();render();toast('تم حذف التسجيل')}
function showView(v){if(!['home','add','progress','settings'].includes(v))return;document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${v}`));document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('selected',x.dataset.view===v));window.scrollTo({top:0,behavior:'instant'});if(v==='progress')requestAnimationFrame(drawChart);}
function setAddTab(tab){document.querySelectorAll('[data-addtab]').forEach(x=>x.classList.toggle('on',x.dataset.addtab===tab));document.querySelectorAll('.add-panel').forEach(x=>x.classList.toggle('active',x.id===`add-${tab}`));}
let foodMode='catalog';function setFoodMode(mode){foodMode=mode;document.querySelectorAll('[data-foodmode]').forEach(x=>x.classList.toggle('on',x.dataset.foodmode===mode));$('foodCatalogFields').classList.toggle('hidden',mode!=='catalog');$('foodManualFields').classList.toggle('hidden',mode!=='manual');updateFoodEstimate();}
function foodSelection(){return foodCatalog.find(x=>x.id===$('foodItem').value)}
function fillFoodList(){let term=$('foodSearch').value.trim().toLocaleLowerCase('ar');let match=foodCatalog.filter(x=>x.name.includes(term));let previous=$('foodItem').value;$('foodItem').replaceChildren();for(const x of match){let opt=new Option(`${x.name} — ${x.unit} (${x.kcal} سعرة)`,x.id);$('foodItem').add(opt)}if(match.some(x=>x.id===previous))$('foodItem').value=previous;updateFoodEstimate()}
function updateFoodEstimate(){const f=foodSelection();const amount=n($('foodServings').value);const value=foodMode==='manual'?n($('manualKcal').value):(f?f.kcal*amount:0);$('foodEstimate').textContent=`${format(Math.max(0,value))} سعرة`;}
function updateExerciseEstimate(){const activity=activities.find(x=>x.id===$('exerciseType').value);const duration=n($('exerciseMinutes').value);const net=activity?Math.round(Math.max(0,activity.met-1)*currentWeight()*duration/60):0;$('exerciseEstimate').textContent=`${format(net)} سعرة`;return net;}
function timelineText(c=calculate()){
 if(!c)return '';
 const time=c.period,daysLabel=durationLabels[time.days];
 if(c.atGoal)return 'وصلت إلى الوزن المستهدف؛ الأولوية للمحافظة عليه.';
 const projected=Math.max(0,c.deficit*time.days/7700);
 const estimate=`النزول الحسابي التقريبي في ${daysLabel}: حوالي ${projected.toFixed(1)} كجم (قد يختلف كثيرًا بحسب الاستجابة والالتزام).`;
 const caution=c.notFeasible?' ⚠ هدفك الحالي أسرع من المدى المحافظ؛ لن يخفض التطبيق الطعام أو يفرض تمارين شاقة لتعويض الفارق.':' ';
 return `تريد نزول ${c.desiredLoss.toFixed(1)} كجم خلال ${daysLabel}. ${estimate}${caution} ${time.remain>0?`المتبقي من المدة: ${time.remain} يوم.`:'انتهت المدة المحددة؛ اختر فترة جديدة إذا أردت المتابعة.'}`;
}
function workoutForDay(dayOffset){
 const t=timeline();let intensity=state.exerciseIntensity==='vigorous'&&qualifiesVigorous()?'vigorous':'moderate';
 const template=workoutTemplates[intensity];const idx=((dayOffset%7)+7)%7;
 const [name,mins,detail]=template[idx];
 // الأسبوع الأول أخف قليلًا من الأسابيع التالية حتى لا تزيد الشدة فجأة.
 const beginner=intensity==='moderate'&&state.profile.activity===1.2;
 const ramp=t.week===1?(intensity==='vigorous'?.8:beginner?.7:1):1;
 const duration=Math.max(10,Math.round(mins*ramp/5)*5);
 return {name,minutes:duration,detail,intensity};
}
function renderWorkoutHome(c){
 const t=timeline();const todayPlan=workoutForDay(t.elapsed);
 $('goalTimeBadge').textContent=durationLabels[t.days];
 $('workoutTodayTitle').textContent=todayPlan.name;
 $('workoutTodayDesc').textContent=`${todayPlan.minutes} دقيقة · ${todayPlan.detail}`;
 $('goalTimelineHome').textContent=timelineText(c);
}
function renderWorkoutWeek(){
 const root=$('workoutWeek');root.replaceChildren();const t=timeline();
 const start=t.elapsed-t.elapsed%7;
 for(let d=0;d<7&&start+d<t.days;d++){
  const workout=workoutForDay(start+d);
  const line=document.createElement('div');line.className='workout-day'+(start+d===t.elapsed?' current':'');
  const label=document.createElement('strong');label.textContent=`اليوم ${start+d+1}`;
  const detail=document.createElement('span');detail.textContent=`${workout.name} · ${workout.minutes} دقيقة`;
  line.append(label,detail);root.append(line);
 }
 $('workoutWeekNote').textContent=`الأسبوع ${t.week} · تمارين ${state.exerciseIntensity==='vigorous'?'شاقة متدرجة':'متوسطة'} · تمارين المقاومة مرتين أسبوعيًا. يمكنك تبديل الأيام والراحة عند الحاجة؛ توقف عند الدوخة أو ألم الصدر أو ضيق النفس غير المعتاد.`;
}
function renderHome(){if(!state.profile)return;const t=totals(), calc=calculate(),plan=plans[state.plan];let d=new Date();$('todayLabel').textContent=new Intl.DateTimeFormat('ar-SA',{weekday:'long',day:'numeric',month:'long'}).format(d);$('planBadge').textContent=calc.atGoal?'محافظة على الوزن':`الخطة ${plan.label}`;$('planSummary').textContent=calc.atGoal?'وصلت للهدف. استمر على عاداتك الصحية.':`هدف ${calc.manual?'اخترته':'محسوب'}: ${format(calc.calories)} سعرة يوميًا · BMI ${Math.round(bmi(currentWeight())*10)/10}`;
 $('calMaintenance').textContent=format(calc.tdee);$('calDailyTarget').textContent=format(calc.calories);$('calDailyDeficit').textContent=format(calc.deficit);
 $('calorieExplanation').textContent=`${calc.manual?'أنت حددت هدف السعرات بنفسك، وسيبقى ثابتًا حتى تعدله.':'هدف السعرات محسوب تلقائيًا وفق بياناتك.'} احتياج الثبات ≈ ${format(calc.tdee)}، والعجز ≈ ${format(calc.deficit)} سعرة/يوم، ونزول متوقع ≈ ${calc.weeklyLoss.toFixed(2)} كجم/أسبوع (تقدير وليس ضمانًا). ${calc.manual&&calc.calories>=calc.tdee?'السعرات المختارة لا تحقق عجزًا حسب تقديرنا؛ قد لا ينخفض الوزن.':''}`;
 renderWorkoutHome(calc);
 $('calRemain').textContent=format(Math.max(0,calc.calories-t.food));$('calConsumed').textContent=`المتناول: ${format(t.food)}`;$('calBudget').textContent=`الميزانية: ${format(calc.calories)}`;$('calBar').style.width=`${clamp(t.food/calc.calories*100,0,100)}%`;
 $('waterDisplay').textContent=(t.water/1000).toLocaleString('ar-SA',{maximumFractionDigits:2});$('waterBar').style.width=`${clamp(t.water/state.waterGoal*100,0,100)}%`;$('waterRemain').textContent=t.water>=state.waterGoal?'أحسنت، وصلت لهدفك':`باقي ${format(state.waterGoal-t.water)} مل من ${format(state.waterGoal)}`;
 $('exerciseDisplay').textContent=format(t.minutes);$('exerciseBar').style.width=`${clamp(t.minutes/state.minutesGoal*100,0,100)}%`;$('exerciseRemain').textContent=t.minutes>=state.minutesGoal?`أنجزت هدفك · حرق ≈ ${format(t.burned)} سعرة`:`باقي ${format(state.minutesGoal-t.minutes)} دقيقة · حرق ≈ ${format(t.burned)} سعرة`;
 $('weightNow').textContent=currentWeight().toLocaleString('ar-SA',{maximumFractionDigits:1});let loss=state.profile.weight-currentWeight();$('weightDiff').textContent=loss>0?`نقص ${loss.toFixed(1)} كجم منذ البداية`:loss<0?`زيادة ${Math.abs(loss).toFixed(1)} كجم منذ البداية`:'هذه نقطة البداية';
 const safety=$('safetyBanner');const risk=state.profile.health.includes('medical')||state.profile.health.includes('other');safety.classList.toggle('hidden',!risk&&!calc.noDeficit);if(risk)safety.textContent='لديك حالة صحية قد تتطلب خطة فردية؛ هذه أرقام توعوية وليست بديلًا عن مراجعة المختص. تجنّب الحمية المكثفة دون تقييم طبي.';else if(calc.noDeficit)safety.textContent='لا يمكن اقتراح عجز سعرات واضح ضمن الحدود المحافظة بهذه المدخلات. يفضّل طلب تقييم اختصاصي تغذية بدل خفض السعرات أكثر.';
 renderLogList('todayLogs',logOf(null).sort((a,b)=>b.time-a.time));}
function renderLogList(target,logs){const root=$(target);root.replaceChildren();if(!logs.length){root.innerHTML='<div class="empty">لا يوجد تسجيل بعد. أضف وجبتك أو ماءك أو نشاطك الأول ✦</div>';return}for(const x of logs){const el=document.createElement('div');el.className='log-item';const icon=x.type==='water'?'💧':x.type==='exercise'?'🏃':'🍽️';const desc=x.type==='water'?`${format(x.amount)} مل`:x.type==='exercise'?`${format(x.minutes)} دقيقة · ≈ ${format(x.calories)} سعرة`:`${format(x.calories)} سعرة`;el.innerHTML=`<div class="log-icon">${icon}</div><div class="log-body"><strong>${escapeHTML(x.label)}</strong><small>${escapeHTML(desc)}</small></div><button class="remove-btn" data-remove-log="${escapeHTML(x.id)}" aria-label="حذف التسجيل" title="حذف">×</button>`;root.append(el)}}
function renderProgress(){if(!state.profile)return;renderWorkoutWeek();$('startWeight').textContent=state.profile.weight.toFixed(1);$('latestWeight').textContent=currentWeight().toFixed(1);$('goalWeight').textContent=state.profile.target.toFixed(1);$('weighDate').value=$('weighDate').value||today();$('weighValue').value=currentWeight().toFixed(1);$('adjustmentNote').textContent=state.adjustment||'تتغير السعرات تدريجيًا عند تغير الوزن؛ لا تُخفض تلقائيًا بسبب يوم أو يومين من الثبات.';
 const root=$('weightLogs');root.replaceChildren();const data=[...state.weights].sort((a,b)=>b.date.localeCompare(a.date));for(const w of data){const el=document.createElement('div');el.className='log-item';const starting=w.id==='initial';el.innerHTML=`<div class="log-icon">⚖</div><div class="log-body"><strong>${w.value.toFixed(1)} كجم</strong><small>${w.date}${starting?' · البداية':''}</small></div>${starting?'':`<button class="remove-btn" data-remove-weight="${escapeHTML(w.id)}" aria-label="حذف القياس">×</button>`}`;root.append(el)}if(!data.length)root.innerHTML='<div class="empty">لم تسجل قياسات وزن بعد</div>';requestAnimationFrame(drawChart);}
function drawChart(){const cvs=$('weightChart');if(!cvs||!state.profile||!$('view-progress').classList.contains('active'))return;const rect=cvs.getBoundingClientRect();const w=Math.max(280,rect.width),h=230,dpr=window.devicePixelRatio||1;cvs.width=w*dpr;cvs.height=h*dpr;const ctx=cvs.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const data=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);if(!data.length)return;const ys=data.map(x=>x.value).concat(state.profile.target),minimum=Math.floor(Math.min(...ys)-2),maximum=Math.ceil(Math.max(...ys)+2),span=Math.max(3,maximum-minimum);const left=18,right=w-18,top=20,bottom=h-34;ctx.font='11px system-ui';ctx.textBaseline='middle';
 for(let i=0;i<=4;i++){let y=top+(bottom-top)*i/4;ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue('--border').trim()||'#dfebe6';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--muted')||'#728';ctx.textAlign='left';ctx.fillText((maximum-span*i/4).toFixed(0),left+2,y-9)}
 const yFrom=v=>bottom-((v-minimum)/span)*(bottom-top),xFrom=i=>data.length===1?(left+right)/2:left+(right-left)*i/(data.length-1);
 const goalY=yFrom(state.profile.target);ctx.strokeStyle='#e9ae64';ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(left,goalY);ctx.lineTo(right,goalY);ctx.stroke();ctx.setLineDash([]);
 if(data.length>1){ctx.beginPath();data.forEach((p,i)=>i?ctx.lineTo(xFrom(i),yFrom(p.value)):ctx.moveTo(xFrom(i),yFrom(p.value)));ctx.strokeStyle='#087d78';ctx.lineWidth=3;ctx.stroke()}
 data.forEach((p,i)=>{ctx.beginPath();ctx.arc(xFrom(i),yFrom(p.value),4.1,0,Math.PI*2);ctx.fillStyle='#0cb89b';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#ffffff';ctx.stroke()});ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--muted')||'#666';ctx.textAlign='center';ctx.fillText(data[0].date.slice(5),xFrom(0),h-14);if(data.length>1)ctx.fillText(data.at(-1).date.slice(5),xFrom(data.length-1),h-14);$('chartHelp').textContent='الخط المتقطع يمثل الوزن المستهدف. تغير الوزن يوميًا قد يعكس الماء والطعام، وليس الدهون فقط.'}
function renderSettings(){if(!state.profile)return;
 $('dailyCalorieGoal').value=state.customCalories??'';$('dailyCalorieGoal').min=state.profile.sex==='male'?'1500':'1200';
 $('storageStatus').textContent='الحفظ على جهازك فقط (localStorage + IndexedDB). لا يرسل التطبيق بياناتك إلى GitHub. استخدم نفس المتصفح أو أيقونة التطبيق دائمًا، واحتفظ بنسخة احتياطية.';
 const estimate=calculate();$('customCalorieInfo').textContent=`${estimate.manual?'هدفك اليدوي محفوظ': 'الحساب التلقائي مفعل'} · هدف ${format(estimate.calories)} سعرة · المتوقع نحو ${estimate.weeklyLoss.toFixed(2)} كجم أسبوعيًا (تقريبي). اختيار الخطة الهادئة أو المتوسطة أو السريعة يحدد مستوى النشاط، أما السعرات اليدوية فلا تتغير دون موافقتك.`;
 document.querySelectorAll('[data-duration]').forEach(b=>{const active=n(b.dataset.duration)===state.goalDays;b.classList.toggle('on',active);b.setAttribute('aria-pressed',String(active));});
 const v=calculate(),fitness=qualifiesVigorous();
 $('quickGoalFeedback').textContent=`وزنك الحالي ${currentWeight().toFixed(1)} كجم ← هدفك ${state.profile.target.toFixed(1)} كجم. ${timelineText(v)}`;
 document.querySelectorAll('[data-intensity="vigorous"]').forEach(b=>{b.title=fitness?'تمارين شاقة متدرجة لمن اعتادها':'الشدة الشاقة تحتاج لياقة سابقة وملاءمة صحية';b.setAttribute('aria-disabled',String(!fitness));});$('durationSelect').value=String(state.goalDays);document.querySelectorAll('[data-intensity]').forEach(x=>x.classList.toggle('on',x.dataset.intensity===state.exerciseIntensity));$('waterGoal').value=state.waterGoal;$('minutesGoal').value=state.minutesGoal;$('goalWeightInput').value=state.profile.target;$('remindersEnabled').checked=state.settings.reminders;$('quietStart').value=state.settings.quietStart;$('quietEnd').value=state.settings.quietEnd;document.querySelectorAll('[data-frequency]').forEach(x=>x.classList.toggle('on',n(x.dataset.frequency)===state.settings.frequency));document.querySelectorAll('[data-plan]').forEach(x=>x.classList.toggle('active',x.dataset.plan===state.plan));const c=calculate();$('planInfo').textContent=`احتياج المحافظة ≈ ${format(c.tdee)} سعرة/يوم. هدف الطعام ≈ ${format(c.calories)} وعجز ≈ ${format(c.deficit)} سعرة/يوم. ${qualifiesFast()?'':'الخطة المكثفة مقيدة حسب الأهلية.'}`;$('timelineSummary').textContent=timelineText(c);$('notifyStatus').textContent=`الإشعارات: ${('Notification'in window)?Notification.permission:'غير مدعومة في هذا المتصفح'}؛ الجدولة داخل التطبيق فقط ما لم تستورد التقويم.`;}
function render(){if(!state.profile)return;renderHome();renderProgress();renderSettings();updateFoodEstimate();updateExerciseEstimate();}
function showSetup(edit=false){const p=state.profile;if(edit&&p){$('setupDailyCalories').value=state.customCalories??'';$('setupPlan').value=state.plan;$('age').value=p.age;$('sex').value=p.sex;$('height').value=p.height;$('weight').value=p.weight;$('targetWeight').value=p.target;$('activity').value=p.activity;document.querySelectorAll('[name="health"]').forEach(x=>x.checked=p.health.includes(x.value));}else{$('setupForm').reset();$('setupDailyCalories').value='';$('setupPlan').value='moderate'}$('setupError').classList.add('hidden');$('setupDialog').showModal();}
async function setupFromForm(e){e.preventDefault();const p={age:n($('age').value),sex:$('sex').value,height:n($('height').value),weight:n($('weight').value),target:n($('targetWeight').value),activity:n($('activity').value),health:[...document.querySelectorAll('[name="health"]:checked')].map(x=>x.value)};let msg='';if(p.age<18||p.age>100)msg='التطبيق مخصص للبالغين بعمر 18 عامًا أو أكثر.';else if(!['male','female'].includes(p.sex)||p.height<120||p.height>230||p.weight<30||p.weight>400)msg='تحقق من الطول والوزن وبقية البيانات.';else if(p.health.includes('pregnancy')||p.health.includes('eating'))msg='لا يصدر خطوتي خطط نزول وزن آلية للحمل أو الرضاعة أو اضطرابات الأكل؛ يرجى الاستعانة بمختص.';else if(bmiFor(p.height,p.weight)<25)msg='هذه النسخة مخصصة مبدئيًا للبالغين ذوي زيادة الوزن (BMI لا يقل عن 25). استشر مختصًا قبل محاولة خفض وزن يقع في النطاق الطبيعي.';else if(p.target>=p.weight)msg='اختر وزنًا مستهدفًا أقل من الوزن الحالي.';else if(bmiFor(p.height,p.target)<18.5)msg='الوزن المستهدف يدخل نطاق نقص الوزن؛ يُرجى اختيار هدف ملائم طبيًا.';else if(p.health.length&&state.plan==='fast')state.plan='moderate';
 if(!msg){const chosen=validateCalorieChoice($('setupDailyCalories').value,p,p.weight);if(chosen.message)msg=chosen.message;}
 if(msg){$('setupError').textContent=msg;$('setupError').classList.remove('hidden');return}
 const editing=!!state.profile;
 state.customCalories=validateCalorieChoice($('setupDailyCalories').value,p,p.weight).value;
 if(!editing)state.plan=plans[$('setupPlan').value]?$('setupPlan').value:'moderate';
 state.profile=p;if(!editing){state.weights=[{id:'initial',date:today(),value:p.weight}];state.minutesGoal=plans[state.plan].mins;state.goalStart=today();state.goalStartWeight=p.weight;}else{if(!state.weights.length)state.weights=[{id:'initial',date:today(),value:p.weight}];if(state.weights[0]?.id==='initial')state.weights[0].value=p.weight;}if(state.plan==='fast'&&!qualifiesFast())state.plan='moderate';if(state.exerciseIntensity==='vigorous'&&!qualifiesVigorous())state.exerciseIntensity='moderate';state.adjustment='تم تحديث التقديرات بعد تعديل بياناتك الأساسية.';const saved=await save();if(!saved){$('setupError').textContent='لا يستطيع المتصفح حفظ بياناتك محليًا في هذا الوضع. افتح التطبيق في Safari العادي أو من الشاشة الرئيسية وتأكد من توفر مساحة.';$('setupError').classList.remove('hidden');return}$('setupDialog').close();render();toast('تم حفظ بياناتك محليًا؛ لن تحتاج لإدخالها مجددًا على هذا الجهاز')}
function switchPlan(plan){if(!plans[plan])return;if(plan==='fast'&&!qualifiesFast()){toast('الخطة المكثفة غير ملائمة حسب مؤشرات الأهلية الحالية');return}state.plan=plan;state.minutesGoal=plans[plan].mins;state.adjustment=`اخترت الخطة ${plans[plan].label}؛ ${state.customCalories?'احتفظنا بالسعرات التي حددتها، وعدّلنا النشاط المقترح فقط.':'أعدنا حساب السعرات والنشاط وفق المستوى الجديد.'}`;save();render();toast('تم تحديث الخطة')}
function recordWeight(e){e.preventDefault();const val=n($('weighValue').value),date=$('weighDate').value;if(val<30||val>400||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today()){toast('أدخل وزنًا وتاريخًا صالحين');return}const old=calculate();const existing=state.weights.find(x=>x.date===date);if(existing){existing.value=val}else state.weights.push({id:id(),date,value:val});const now=calculate();if(now&&old){const change=now.calories-old.calories;state.adjustment=state.customCalories?'سُجّل وزنك. حافظنا على هدف السعرات الذي اخترته؛ قد يتغيّر تقدير سرعة النزول بسبب تغيّر الوزن.':Math.abs(change)>=25?`تغير هدف السعرات من ${format(old.calories)} إلى ${format(now.calories)} بعد تحديث وزنك، لأن الاحتياج التقريبي للطاقة يتغير مع الوزن.`:'سُجّل وزنك. التغير الحالي لا يستلزم تعديلًا كبيرًا في هدف السعرات.'}if(state.plan==='fast'&&!qualifiesFast()){state.plan='moderate';state.adjustment+=' تم تحويل الخطة إلى المتوسطة لأن شروط المستوى المكثف لم تعد متحققة.'}if(state.exerciseIntensity==='vigorous'&&!qualifiesVigorous()){state.exerciseIntensity='moderate';state.adjustment+=' تحولت شدة التمارين إلى متوسطة حفاظًا على السلامة.'}save();render();toast('حُفظ قياس الوزن')}
function download(text,name,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);let a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function backup(){download(JSON.stringify(state,null,2),`khatwati-backup-${today()}.json`,'application/json;charset=utf-8');toast('تم إنشاء النسخة الاحتياطية')}
async function importBackup(file){if(!file||file.size>3_000_000){toast('الملف غير مناسب أو كبير جدًا');return}try{const content=await file.text();const loaded=validateData(JSON.parse(content));if(!confirm('سيستبدل الاستيراد جميع بيانات خطوتي الحالية في هذا الجهاز. هل تريد المتابعة؟'))return;state=loaded;const saved=await save();if(!saved){toast('لم ينجح الحفظ المحلي؛ تحقق من مساحة الجهاز');return}applyTheme();render();showView('home');if(!state.profile)showSetup();toast('تم استيراد النسخة بنجاح')}catch(e){toast(`تعذر الاستيراد: ${e.message}`)}}
function applyTheme(){document.body.classList.toggle('dark',state.settings.dark);$('themeToggle').textContent=state.settings.dark?'☀':'☾';document.querySelector('meta[name="theme-color"]').content=state.settings.dark?'#09282d':'#087D78';}
function minuteOf(s){const [h,m]=s.split(':').map(Number);return h*60+m}
function isQuiet(minutes){const start=minuteOf(state.settings.quietStart),end=minuteOf(state.settings.quietEnd);if(start===end)return false;return start<end?minutes>=start&&minutes<end:minutes>=start||minutes<end}
function scheduledMinutes(){let start=minuteOf(state.settings.quietEnd),step=state.settings.frequency*60,result=[];for(let x=0;x<1440;x+=step){const at=(start+x)%1440;if(!isQuiet(at))result.push(at)}return result.sort((a,b)=>a-b)}
async function notify(title,body){if(!('Notification'in window)||Notification.permission!=='granted')return;try{const reg=await navigator.serviceWorker?.ready;if(reg?.showNotification)await reg.showNotification(title,{body,icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',tag:'khatwati-reminder'});else new Notification(title,{body,icon:'./assets/icon-192.png'});}catch(e){console.warn('لم يمكن عرض التنبيه',e)}}
function checkReminders(){if(!state.profile||!state.settings.reminders)return;const now=new Date(),m=now.getHours()*60+now.getMinutes();if(isQuiet(m))return;const slot=scheduledMinutes().find(v=>m>=v&&m<v+2);if(slot===undefined)return;const key=`${today()}:${slot}`;if(state.settings.lastReminder===key)return;state.settings.lastReminder=key;save();const t=totals(),waterLeft=Math.max(0,state.waterGoal-t.water),minsLeft=Math.max(0,state.minutesGoal-t.minutes);if(!waterLeft&&!minsLeft)return;const parts=[];if(waterLeft)parts.push(`الماء: باقي ${format(waterLeft)} مل`);if(minsLeft)parts.push(`الحركة: باقي ${format(minsLeft)} دقيقة`);notify('خطوتي · تذكير لطيف',parts.join(' · '));}
function icsEscape(s){return String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function exportCalendar(){if(!state.settings.reminders){toast('فعّل التذكيرات أولًا');return}const slots=scheduledMinutes();if(!slots.length){toast('فترة النوم تغطي جميع المواعيد');return}const now=new Date(),fmtDate=d=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`,stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Khatwati//Reminders//AR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:تذكيرات خطوتي'];for(const mins of slots){const date=new Date(now.getFullYear(),now.getMonth(),now.getDate(),Math.floor(mins/60),mins%60,0);if(date<=now)date.setDate(date.getDate()+1);const start=fmtDate(date)+'T'+String(date.getHours()).padStart(2,'0')+String(date.getMinutes()).padStart(2,'0')+'00';lines.push('BEGIN:VEVENT',`UID:${id()}@khatwati.local`,`DTSTAMP:${stamp}`,`DTSTART:${start}`,`DURATION:PT5M`,'RRULE:FREQ=DAILY;COUNT=365',`SUMMARY:${icsEscape('خطوتي: تذكير ماء وحركة')}`,`DESCRIPTION:${icsEscape('افتح تطبيق خطوتي لمراجعة ما تبقى من أهدافك. يمكنك إيقاف هذه التذكيرات من التقويم.')}`,'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:حان وقت مراجعة أهدافك في خطوتي','END:VALARM','END:VEVENT')};lines.push('END:VCALENDAR');download(lines.join('\r\n')+'\r\n','khatwati-reminders.ics','text/calendar;charset=utf-8');toast('تم تصدير التقويم. استورده في تطبيق التقويم لتصل التنبيهات وهو مغلق.')}
function wire(){document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{let v=b.dataset.jump;if(v==='add-exercise'){showView('add');setAddTab('exercise')}else{showView(v)}}));document.querySelectorAll('[data-addtab]').forEach(b=>b.addEventListener('click',()=>setAddTab(b.dataset.addtab)));document.querySelectorAll('[data-foodmode]').forEach(b=>b.addEventListener('click',()=>setFoodMode(b.dataset.foodmode)));
 $('setupForm').addEventListener('submit',setupFromForm);
 $('calorieGoalForm').addEventListener('submit',e=>{
  e.preventDefault();const raw=$('dailyCalorieGoal').value;
  const checked=validateCalorieChoice(raw,state.profile,currentWeight());
  if(checked.message){toast(checked.message);$('customCalorieInfo').textContent=checked.message;return}
  state.customCalories=checked.value;
  state.adjustment=checked.value?'تم تثبيت هدف السعرات الذي اخترته. مستويات الخطة تؤثر في التمارين؛ يُحسب النزول المتوقع من عجز السعرات الفعلي.':'أعدنا تفعيل حساب السعرات التلقائي حسب بياناتك.';
  save();render();toast(checked.value?'تم حفظ هدف السعرات يدويًا':'تم تفعيل الحساب التلقائي');
 });
 $('resetCalorieGoal').addEventListener('click',()=>{state.customCalories=null;state.adjustment='تم الرجوع للحساب التلقائي للسعرات.';save();render();toast('تم التفعيل')});$('editProfileBtn').addEventListener('click',()=>showSetup(true));$('foodSearch').addEventListener('input',fillFoodList);$('foodItem').addEventListener('change',updateFoodEstimate);$('foodServings').addEventListener('input',updateFoodEstimate);$('manualKcal').addEventListener('input',updateFoodEstimate);$('exerciseType').addEventListener('change',updateExerciseEstimate);$('exerciseMinutes').addEventListener('input',updateExerciseEstimate);
 $('foodForm').addEventListener('submit',e=>{e.preventDefault();let label='',kcal=0,amount=0;if(foodMode==='catalog'){const f=foodSelection();const servings=n($('foodServings').value);if(!f||servings<.25||servings>30){toast('حدد طعامًا وحصة صحيحة');return}label=`${f.name} × ${servings} (${f.unit})`;kcal=Math.round(f.kcal*servings);amount=servings}else{kcal=n($('manualKcal').value);label=$('manualFoodName').value.trim().slice(0,70)||'وجبة مدخلة يدويًا';amount=1;if(kcal<1||kcal>5000){toast('أدخل سعرات من 1 إلى 5000');return}}addLog({type:'food',label,amount,calories:kcal});$('foodSearch').value='';$('foodServings').value=1;$('manualKcal').value='';$('manualFoodName').value='';fillFoodList();showView('home')});
 $('exerciseForm').addEventListener('submit',e=>{e.preventDefault();const act=activities.find(x=>x.id===$('exerciseType').value),mins=n($('exerciseMinutes').value);if(!act||mins<1||mins>300){toast('أدخل نوع نشاط ومدة صالحة');return}addLog({type:'exercise',label:act.name,amount:mins,minutes:mins,calories:updateExerciseEstimate()});showView('home')});
 function addWater(ml){if(ml<1||ml>2000)return toast('أدخل كمية ماء صالحة');addLog({type:'water',label:'شرب ماء',amount:ml,calories:0});showView('home')}
 $('water250').addEventListener('click',()=>addWater(250));$('water500').addEventListener('click',()=>addWater(500));document.querySelectorAll('[data-water]').forEach(b=>b.addEventListener('click',()=>addWater(n(b.dataset.water))));$('waterForm').addEventListener('submit',e=>{e.preventDefault();addWater(n($('customWater').value));$('customWater').value=''});
 document.addEventListener('click',e=>{const target=e.target.closest('[data-remove-log]');if(target)deleteLog(target.dataset.removeLog);const weightTarget=e.target.closest('[data-remove-weight]');if(weightTarget){state.weights=state.weights.filter(x=>x.id!==weightTarget.dataset.removeWeight);save();render();toast('حُذف القياس')}});
 $('weightForm').addEventListener('submit',recordWeight);window.addEventListener('resize',()=>{if($('view-progress').classList.contains('active'))drawChart()});document.querySelectorAll('[data-plan]').forEach(b=>b.addEventListener('click',()=>switchPlan(b.dataset.plan)));
 $('goalForm').addEventListener('submit',e=>{e.preventDefault();const water=n($('waterGoal').value),minutes=n($('minutesGoal').value),target=n($('goalWeightInput').value);if(water<500||water>6000||minutes<5||minutes>180||target>=currentWeight()||bmiFor(state.profile.height,target)<18.5){toast('راجع الأهداف؛ لا يمكن تعيين هدف وزن غير آمن');return}const changed=state.profile.target!==target;state.waterGoal=water;state.minutesGoal=minutes;state.profile.target=target;if(changed){state.goalStart=today();state.goalStartWeight=currentWeight();}save();render();toast('تم تحديث الأهداف')});
 function setDuration(days){if(![14,30,60].includes(days)||state.goalDays===days)return;state.goalDays=days;state.goalStart=today();state.goalStartWeight=currentWeight();save();render();toast('تم تحديث المدة والسعرات والتمارين دون فقد السجلات');}
 $('durationSelect').addEventListener('change',e=>setDuration(n(e.target.value)));
 document.querySelectorAll('[data-duration]').forEach(b=>b.addEventListener('click',()=>setDuration(n(b.dataset.duration))));
 document.querySelectorAll('[data-intensity]').forEach(b=>b.addEventListener('click',()=>{const intensity=b.dataset.intensity;if(intensity==='vigorous'&&!qualifiesVigorous()){toast('الشدة الشاقة لا تناسب بياناتك الحالية؛ اختر التمارين المتوسطة أو راجع مختصًا');return}state.exerciseIntensity=intensity;save();render();toast('تم تحديث برنامج التمارين')}));
 $('remindersEnabled').addEventListener('change',e=>{state.settings.reminders=e.target.checked;save();renderSettings();toast(e.target.checked?'فُعّلت تذكيرات التطبيق المفتوح':'تم تعطيل التذكيرات')});document.querySelectorAll('[data-frequency]').forEach(b=>b.addEventListener('click',()=>{state.settings.frequency=n(b.dataset.frequency);state.settings.lastReminder='';save();renderSettings()}));
 for(const id of ['quietStart','quietEnd'])$(id).addEventListener('change',()=>{state.settings.quietStart=$('quietStart').value;state.settings.quietEnd=$('quietEnd').value;state.settings.lastReminder='';save();renderSettings()});
 $('permissionBtn').addEventListener('click',async()=>{if(!('Notification'in window)){toast('هذا الجهاز أو المتصفح لا يدعم إشعارات الويب في هذا الوضع');return}try{const result=await Notification.requestPermission();renderSettings();toast(result==='granted'?'تم السماح. تذكيرات التطبيق المفتوح جاهزة.':'لم تُمنح صلاحية الإشعارات')}catch(e){toast('تعذر طلب الإذن. جرّب تثبيت التطبيق على الشاشة الرئيسية')}});
 $('calendarBtn').addEventListener('click',exportCalendar);$('exportBtn').addEventListener('click',backup);$('importBtn').addEventListener('click',()=>$('importFile').click());$('importFile').addEventListener('change',async e=>{await importBackup(e.target.files?.[0]);e.target.value=''});$('deleteBtn').addEventListener('click',async()=>{if(!confirm('هل أنت متأكد من حذف جميع بياناتك؟ لا يمكن التراجع إلا بنسخة احتياطية.'))return;try{localStorage.removeItem(KEY)}catch(e){}await writeQueue.catch(()=>{});await clearIndexed();state=defaults();applyTheme();showView('home');showSetup();toast('تم مسح بيانات هذا الجهاز')});$('themeToggle').addEventListener('click',()=>{state.settings.dark=!state.settings.dark;save();applyTheme();if($('view-progress').classList.contains('active'))drawChart()});}
async function registerSW(){if('serviceWorker'in navigator){try{await navigator.serviceWorker.register('./sw.js',{scope:'./'})}catch(e){console.warn('تعذر تفعيل وضع عدم الاتصال',e)}}}
let deferredInstall=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('installBtn').classList.remove('hidden')});$('installBtn').addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('installBtn').classList.add('hidden')});
async function init(){await restoreState();for(const a of activities){$('exerciseType').add(new Option(a.name,a.id))}fillFoodList();applyTheme();wire();$('weighDate').value=today();if(state.profile){render()}else{showSetup()}registerSW();setInterval(checkReminders,60_000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReminders()});}
init();
})();