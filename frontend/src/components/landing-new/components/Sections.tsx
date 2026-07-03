"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BellIcon, BoltIcon, ChartIcon, ChefHatIcon, CheckIcon, PlayIcon, QrIcon, SparkleIcon, StarIcon, XIcon } from "./Icons";
import { useI18n } from "../i18n";

/* ── reveal on scroll ── */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T|null>(null);
  useEffect(()=>{
    const el=ref.current; if(!el)return;
    const io=new IntersectionObserver(([e])=>{if(e.isIntersecting)el.classList.add("in");},{threshold:.1});
    io.observe(el); return()=>io.disconnect();
  },[]);
  return ref;
}

/* ══════════════════════════════════════════
   LIVE TICKER — simulated activity feed
   ══════════════════════════════════════════ */
const TICKS = [
  "🍕 Bella Napoli received order #4,201 · Mumbai · 12s ago",
  "🍝 Saffron House updated menu · Bengaluru · 1m ago",
  "📊 Tandoor Nights hit ₹2L today · Delhi · 3m ago",
  "🔔 Olive & Oak — 40 QR orders in last hour · Pune · 5m ago",
  "✅ Coastal Grill — zero wrong orders today · Goa · 8m ago",
  "🎉 Verde Bistro just onboarded · Hyderabad · 11m ago",
];

export function LiveTicker() {
  const list = [...TICKS,...TICKS];
  return (
    <div className="py-3 bg-black/50 border-y border-white/5 overflow-hidden">
      <div className="marquee-mask">
        <div className="flex gap-10 animate-ticker w-max">
          {list.map((t,i)=>(
            <span key={i} className="text-[11px] sm:text-xs text-cream/60 whitespace-nowrap flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-blink inline-block" />{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   LOGO MARQUEE
   ══════════════════════════════════════════ */
export function LogoMarquee() {
  const { t } = useI18n();
  const logos = ["The Spice Route","Olive & Oak","Sakura Sushi","Bella Napoli","Cafe Mocha","Saffron House","Tandoor Nights","Verde Bistro","Maison 1908","Coastal Grill"];
  const list = [...logos,...logos];
  return (
    <section className="py-8 sm:py-10 border-b border-white/5 bg-black/30">
      <p className="text-center text-[10px] uppercase tracking-[.2em] text-cream/40 mb-4">{t("marquee.title")}</p>
      <div className="marquee-mask overflow-hidden">
        <div className="flex gap-8 sm:gap-12 animate-ticker w-max">
          {list.map((l,i)=><span key={i} className="font-display text-lg sm:text-2xl text-cream/45 whitespace-nowrap">{l}</span>)}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   WHAT GUESTS EXPERIENCE — 4 big cards
   ══════════════════════════════════════════ */
export function GuestExperience() {
  const ref = useReveal<HTMLElement>();
  const cards = [
    { emoji:"📱", title:"Scan & order in seconds", sub:"No app. Just camera.", color:"from-ai-1/20 to-ai-2/10", border:"border-ai-2/20",
      visual:<ScanVisual/> },
    { emoji:"✨", title:"AI picks the best for you", sub:"Like a personal food expert.", color:"from-gold/15 to-orange/10", border:"border-gold/20",
      visual:<AIVisual/> },
    { emoji:"📍", title:"Track your food live", sub:"Know exactly when it arrives.", color:"from-emerald-400/15 to-teal-400/5", border:"border-emerald-400/20",
      visual:<TrackVisual/> },
    { emoji:"💳", title:"Pay in one tap", sub:"Split with friends instantly.", color:"from-purple-500/15 to-ai-2/10", border:"border-purple-500/20",
      visual:<PayVisual/> },
  ];
  return (
    <section id="features" ref={ref} className="reveal py-14 sm:py-24 relative">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest text-ai-2 mb-3">✨ For Guests</div>
          <h2 className="font-display text-[32px] sm:text-5xl md:text-6xl tracking-tight leading-tight">Dining that feels <span className="italic text-gradient-ai">like magic.</span></h2>
          <p className="mt-3 text-[14px] sm:text-base text-cream/60 max-w-md mx-auto">No waiting. No confusion. Just enjoy.</p>
        </div>

        {/* mobile: horizontal scroll */}
        <div className="sm:hidden -mx-5 px-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-3 pb-3 w-max">
            {cards.map((c,i)=><GuestCard key={i} {...c}/>)}
            <div className="w-2 shrink-0"/>
          </div>
          <ScrollDots total={4}/>
        </div>
        {/* desktop: grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c,i)=><GuestCard key={i} {...c} desktop/>)}
        </div>
      </div>
    </section>
  );
}

function GuestCard({emoji,title,sub,color,border,visual,desktop}:{emoji:string;title:string;sub:string;color:string;border:string;visual:React.ReactNode;desktop?:boolean}) {
  return (
    <div className={`snap-center shrink-0 ${desktop?"w-auto":"w-[72vw] max-w-[260px]"} glass rounded-3xl overflow-hidden border ${border} hover-lift group`}>
      <div className={`h-36 sm:h-44 bg-gradient-to-br ${color} flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 grid-bg opacity-30"/>
        {visual}
      </div>
      <div className="p-4">
        <div className="text-2xl mb-2">{emoji}</div>
        <h3 className="font-display text-lg sm:text-xl leading-tight">{title}</h3>
        <p className="mt-1 text-[12px] sm:text-sm text-cream/55">{sub}</p>
      </div>
    </div>
  );
}

/* Guest card visuals */
function ScanVisual() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 h-20 bg-white rounded-2xl p-2 shadow-2xl animate-floaty" style={{perspective:"400px",transform:"rotateX(12deg) rotateY(-10deg)"}}>
        <MiniQRBig/>
        <div className="absolute left-0 right-0 h-0.5 bg-gold blur-sm" style={{top:"50%"}}/>
      </div>
      <div className="space-y-1.5">
        <div className="glass-strong rounded-xl px-2.5 py-1.5 text-[10px] text-emerald-300 flex items-center gap-1"><CheckIcon className="w-3 h-3"/>Menu loaded!</div>
        <div className="glass-strong rounded-xl px-2.5 py-1.5 text-[10px] text-cream/70">Table 7 ·  Saffron House</div>
      </div>
    </div>
  );
}
function AIVisual() {
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-ai-1/50 to-ai-2/50 blur-xl animate-floaty-slow"/>
      <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-ai-1 to-ai-2 flex items-center justify-center shadow-[0_0_30px_rgba(176,107,255,.6)]">
        <SparkleIcon className="w-6 h-6 text-white"/>
      </div>
      <div className="absolute top-3 right-6 glass-strong rounded-xl px-2 py-1 text-[9px] text-cream animate-floaty">🍝 Perfect for you!</div>
    </div>
  );
}
function TrackVisual() {
  return (
    <div className="space-y-1.5 px-4 py-2">
      {[["Received","done"],["Preparing","active"],["Ready","idle"],["Served","idle"]].map(([s,st])=>(
        <div key={s} className={`flex items-center gap-2 text-[11px] rounded-lg px-2.5 py-1.5 ${st==="active"?"bg-orange/20 text-orange":st==="done"?"bg-emerald-400/10 text-emerald-300":"bg-white/5 text-cream/40"}`}>
          <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${st==="active"?"border-orange":"border-current"}`}>
            {st==="done"&&<CheckIcon className="w-2 h-2"/>}
            {st==="active"&&<div className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse"/>}
          </div>{s}
        </div>
      ))}
    </div>
  );
}
function PayVisual() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="glass-strong rounded-2xl px-4 py-3 text-center animate-floaty">
        <div className="text-[10px] text-cream/60">Total bill</div>
        <div className="font-display text-xl text-gradient-gold">₹ 1,240</div>
      </div>
      <div className="flex gap-2 text-[10px]">
        <div className="glass-strong rounded-full px-2.5 py-1 text-gold border border-gold/30">Split evenly</div>
        <div className="glass-strong rounded-full px-2.5 py-1 text-cream/60">Pay all</div>
      </div>
    </div>
  );
}
function MiniQRBig(){const c=Array.from({length:64},(_,i)=>((i*43+7)%7)>3);return <div className="grid grid-cols-8 gap-px w-full h-full">{c.map((on,i)=><div key={i} className={on?"bg-black":""}/>)}</div>;}

/* ══════════════════════════════════════════
   OWNER WINS — 3 punchy big stats + bento
   ══════════════════════════════════════════ */
export function OwnerWins() {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal py-14 sm:py-24 relative">
      <div className="absolute top-1/2 left-0 w-96 h-96 rounded-full blur-3xl opacity-10 -z-10" style={{background:"radial-gradient(closest-side,rgba(232,185,107,.6),transparent)"}}/>
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest text-gold mb-3">🏪 For Owners</div>
          <h2 className="font-display text-[32px] sm:text-5xl md:text-6xl tracking-tight leading-tight">More money. <span className="italic text-gradient-gold">Less stress.</span></h2>
          <p className="mt-3 text-[14px] sm:text-base text-cream/60 max-w-md mx-auto">Every single day, automatically.</p>
        </div>

        {/* 3 big stat pills */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
          {[{v:"+32%",l:"Revenue",c:"text-gradient-gold"},{v:"2×",l:"Faster kitchen",c:"text-orange"},{v:"30%",l:"More tables",c:"text-gradient-ai"}].map(x=>(
            <div key={x.l} className="glass rounded-2xl sm:rounded-3xl py-4 sm:py-6 text-center hover-lift">
              <div className={`font-display text-2xl sm:text-5xl ${x.c}`}>{x.v}</div>
              <div className="text-[10px] sm:text-xs text-cream/50 mt-1 uppercase tracking-wider">{x.l}</div>
            </div>
          ))}
        </div>

        {/* Bento grid — mobile scroll + desktop grid */}
        <div className="sm:hidden -mx-5 px-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-3 pb-3 w-max">
            {OWNER_CARDS.map((c,i)=><OwnerBentoCard key={i} {...c}/>)}
            <div className="w-2 shrink-0"/>
          </div>
          <ScrollDots total={OWNER_CARDS.length}/>
        </div>
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OWNER_CARDS.map((c,i)=><OwnerBentoCard key={i} {...c} desktop/>)}
        </div>
      </div>
    </section>
  );
}

const OWNER_CARDS = [
  {icon:"📈",title:"Revenue goes up automatically",body:"AI upsells on every order. Avg +32% in month 1.",stat:"+₹40k/mo avg"},
  {icon:"👨‍🍳",title:"Kitchen stops making mistakes",body:"Digital tickets. Real-time. Zero shouting.",stat:"Zero errors"},
  {icon:"📵",title:"No more printing menus",body:"Update prices in seconds from your phone.",stat:"Save ₹50k/yr"},
  {icon:"📅",title:"Bookings, organised",body:"Online reservations. No double-bookings.",stat:"+40% tables filled"},
  {icon:"🌐",title:"Run every branch",body:"One login for all your outlets.",stat:"50+ outlets"},
  {icon:"😌",title:"Staff actually enjoy work",body:"Less chaos. Happier team. Better service.",stat:"-60% stress"},
];

function OwnerBentoCard({icon,title,body,stat,desktop}:{icon:string;title:string;body:string;stat:string;desktop?:boolean}) {
  return (
    <div className={`snap-center shrink-0 ${desktop?"w-auto":"w-[72vw] max-w-[260px]"} glass rounded-3xl p-5 hover-lift relative overflow-hidden group border border-gold/10`}>
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gold/10 blur-2xl group-hover:opacity-100 opacity-60 transition"/>
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-display text-lg sm:text-xl leading-tight">{title}</h3>
      <p className="mt-1.5 text-[12px] sm:text-sm text-cream/55 leading-relaxed">{body}</p>
      <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-cream glass-strong rounded-full px-2.5 py-1">
        <CheckIcon className="w-3 h-3 text-gold"/>{stat}
      </div>
    </div>
  );
}



export function LoginOptions() {
  return (
    <section className="py-12 sm:py-20 relative">
      <div className="mx-auto max-w-md px-5 sm:px-6">
        <div className="card-solid rounded-3xl p-6 sm:p-8 border-2 border-gold/40 shadow-[0_20px_60px_-20px_rgba(232,185,107,0.4)]">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-3 py-1.5 text-[11px] text-gold uppercase tracking-widest mb-5">
              <SparkleIcon className="w-3 h-3" /> New restaurant?
            </div>
            <h2 className="font-display text-[28px] sm:text-4xl tracking-tight leading-tight mb-3">
              Start free for <span className="italic text-gradient-gold">14 days</span>
            </h2>
            <p className="text-sm text-cream/70 leading-relaxed">
              Setup completed in 10 minutes — we do it all for you.
            </p>
          </div>

          <a href="/auth/restaurant?tab=register" className="btn-primary w-full justify-center mt-6 py-4 text-base shadow-2xl">
            Sign up free <ArrowRight className="w-4 h-4" />
          </a>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] sm:text-[11px] text-cream/55">
            <div>🔒 Secure</div>
            <div>⚡ 10 min setup</div>
            <div>💳 No card</div>
          </div>
        </div>
      </div>
    </section>
  );
}





/* ══════════════════════════════════════════
   RESTAURANT QUIZ
   ══════════════════════════════════════════ */
const QUIZ = [
  { q:"What kind of restaurant?", opts:[{e:"☕",l:"Café"},{e:"🍽️",l:"Restaurant"},{e:"📦",l:"Cloud Kitchen"},{e:"🏨",l:"Hotel"}] },
  { q:"How big are you?", opts:[{e:"👤",l:"Solo"},{e:"👥",l:"Small"},{e:"🏪",l:"Medium"},{e:"🏢",l:"Chain"}] },
  { q:"Biggest pain point?", opts:[{e:"🧾",l:"Orders"},{e:"👨‍🍳",l:"Kitchen"},{e:"📊",l:"Analytics"},{e:"📵",l:"Menus"}] },
];

export function RestaurantQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const pick = (label: string) => {
    const next = [...answers, label];
    setAnswers(next);
    if (step < QUIZ.length - 1) setStep(s => s + 1);
    else setDone(true);
  };

  const reset = () => { setStep(0); setAnswers([]); setDone(false); };

  return (
    <section className="py-14 sm:py-20 relative">
      <div className="mx-auto max-w-2xl px-5 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="font-display text-[32px] sm:text-5xl tracking-tight leading-tight">Find your <span className="italic text-gradient-gold">perfect setup.</span></h2>
          <p className="mt-2 text-[13px] sm:text-base text-cream/55">3 quick taps. We'll show you exactly how SmartDine fits.</p>
        </div>

        <div className="glass-strong rounded-3xl p-5 sm:p-8 relative overflow-hidden border border-gold/15">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gold/10 blur-3xl"/>
          {!done ? (
            <div className="quiz-slide relative" key={step}>
              {/* progress */}
              <div className="flex gap-1.5 mb-6">
                {QUIZ.map((_,i)=><div key={i} className={`flex-1 h-1 rounded-full transition-all duration-500 ${i<=step?"bg-gold":"bg-white/10"}`}/>)}
              </div>
              <h3 className="font-display text-xl sm:text-3xl mb-5 text-center">{QUIZ[step].q}</h3>
              <div className="grid grid-cols-2 gap-3">
                {QUIZ[step].opts.map(o=>(
                  <button key={o.l} onClick={()=>pick(o.l)}
                    className="glass rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-2 hover-lift border border-white/8 active:scale-95 transition">
                    <span className="text-3xl sm:text-4xl">{o.e}</span>
                    <span className="text-[13px] sm:text-sm text-cream">{o.l}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="quiz-slide text-center py-4">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="font-display text-2xl sm:text-3xl mb-2">Perfect fit found!</h3>
              <p className="text-[13px] sm:text-base text-cream/65 mb-1">
                SmartDine for a <b className="text-cream">{answers[1]} {answers[0]}</b>
              </p>
              <p className="text-[13px] text-cream/55 mb-6">We'll solve your <b className="text-gold">{answers[2]}</b> challenge on day one.</p>
              <a href="/auth/restaurant?tab=register" className="btn-primary justify-center mx-auto">Start your free setup <ArrowRight className="w-4 h-4"/></a>
              <button onClick={reset} className="mt-3 block w-full text-center text-[12px] text-cream/45 hover:text-cream">Start over →</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   HOW IT WORKS — 5-step visual flow
   ══════════════════════════════════════════ */
export function HowItWorks() {
  const ref = useReveal<HTMLElement>();
  const steps = [
    {n:"01",e:"📱",t:"Scan QR",d:"Menu opens instantly",icon:<QrIcon className="w-4 h-4"/>},
    {n:"02",e:"✨",t:"AI suggests",d:"Perfect dish, every time",icon:<SparkleIcon className="w-4 h-4"/>},
    {n:"03",e:"👨‍🍳",t:"Kitchen gets it live",d:"No paper, no shouting",icon:<ChefHatIcon className="w-4 h-4"/>},
    {n:"04",e:"🔔",t:"One tap for help",d:"Silent. Instant.",icon:<BellIcon className="w-4 h-4"/>},
    {n:"05",e:"📊",t:"You see everything",d:"Revenue, orders, live",icon:<ChartIcon className="w-4 h-4"/>},
  ];
  return (
    <section id="how" ref={ref} className="reveal py-14 sm:py-24 relative">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="font-display text-[32px] sm:text-5xl md:text-6xl tracking-tight leading-tight">Works in <span className="italic text-gradient-gold">5 simple steps.</span></h2>
          <p className="mt-3 text-[13px] sm:text-base text-cream/55">From guest arrival to you counting money.</p>
        </div>

        {/* mobile: scroll */}
        <div className="sm:hidden -mx-5 px-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-3 pb-3 w-max">
            {steps.map((s,i)=><StepCard key={i} {...s} last={i===steps.length-1}/>)}
            <div className="w-2 shrink-0"/>
          </div>
          <ScrollDots total={5}/>
        </div>
        {/* desktop */}
        <div className="hidden sm:flex gap-4 items-stretch">
          {steps.map((s,i)=><StepCard key={i} {...s} last={i===steps.length-1} desktop/>)}
        </div>
      </div>
    </section>
  );
}

function StepCard({n,e,t,d,last,desktop}:{n:string;e:string;t:string;d:string;icon:React.ReactNode;last:boolean;desktop?:boolean}) {
  return (
    <div className={`snap-center shrink-0 ${desktop?"flex-1":"w-[58vw] max-w-[220px]"} glass rounded-3xl p-5 hover-lift relative overflow-hidden border border-white/6`}>
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gold/10 blur-xl"/>
      <div className="text-[10px] text-cream/35 font-mono mb-3">{n}</div>
      <div className="text-4xl mb-3">{e}</div>
      <h3 className="font-display text-lg sm:text-xl">{t}</h3>
      <p className="mt-1 text-[12px] sm:text-sm text-cream/55">{d}</p>
      {!last && <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-cream/20">→</div>}
    </div>
  );
}

/* ══════════════════════════════════════════
   OBJECTION HANDLER
   ══════════════════════════════════════════ */
export function Objections() {
  const ref = useReveal<HTMLElement>();
  const items = [
    {worry:"My customers aren't tech-savvy.",fix:"Works on any phone. Just scan and order. Like Google Maps.",e:"📱"},
    {worry:"Setup sounds complicated.",fix:"Our team comes to your restaurant. Ready in 30 minutes. Really.",e:"⚡"},
    {worry:"What if internet goes down?",fix:"SmartDine keeps working on 4G. Even with bad connectivity.",e:"📶"},
  ];
  return (
    <section ref={ref} className="reveal py-14 sm:py-20">
      <div className="mx-auto max-w-4xl px-5 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="font-display text-[28px] sm:text-4xl tracking-tight">We know what <span className="italic text-gradient-gold">you're thinking.</span></h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {items.map((it,i)=>(
            <div key={i} className="glass rounded-3xl p-5 hover-lift border border-white/6">
              <div className="text-3xl mb-3">{it.e}</div>
              <div className="text-[12px] sm:text-sm text-cream/45 line-through mb-2 flex items-center gap-1.5"><XIcon className="w-3 h-3 text-red/60 shrink-0"/>{it.worry}</div>
              <div className="flex items-start gap-1.5"><CheckIcon className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5"/><span className="text-[13px] sm:text-sm text-cream">{it.fix}</span></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   COUNTERS
   ══════════════════════════════════════════ */
function Counter({value,suffix=""}:{value:number;suffix?:string}) {
  const [n,setN]=useState(0);
  const ref=useRef<HTMLSpanElement|null>(null);
  useEffect(()=>{
    const el=ref.current; if(!el)return;
    const io=new IntersectionObserver(([e])=>{
      if(e.isIntersecting){
        const s=performance.now(),dur=1400;
        const tick=(t:number)=>{const p=Math.min(1,(t-s)/dur);setN(Math.floor(value*(1-Math.pow(1-p,3))));if(p<1)requestAnimationFrame(tick);};
        requestAnimationFrame(tick);io.disconnect();
      }
    },{threshold:.4});
    io.observe(el); return()=>io.disconnect();
  },[value]);
  return <span ref={ref}>{n.toLocaleString("en-IN")}{suffix}</span>;
}

export function Results() {
  const { t } = useI18n();
  const ref = useReveal<HTMLElement>();
  return (
    <section id="results" ref={ref} className="reveal py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[.2em] text-gold/70 mb-2">{t("results.tag")}</p>
          <h2 className="font-display text-[32px] sm:text-5xl tracking-tight"><span className="italic text-gradient-gold">{t("results.title.2")}</span> {t("results.title.3")}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          {[{v:500,s:"+",l:"Restaurants"},{v:12,s:"M+",l:"Orders"},{v:38,s:"%",l:"Avg uplift"},{v:4,s:".9★",l:"Owner rating"}].map((c,i)=>(
            <div key={i} className="glass rounded-2xl sm:rounded-3xl py-5 sm:py-7 text-center hover-lift">
              <div className="font-display text-3xl sm:text-5xl text-gradient-gold"><Counter value={c.v} suffix={c.s}/></div>
              <div className="text-[10px] sm:text-xs text-cream/45 mt-1.5 uppercase tracking-widest">{c.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   TESTIMONIALS (compact video-style cards)
   ══════════════════════════════════════════ */
const TESTI = [
  {name:"Priya Menon",role:"Saffron House · Bengaluru",q:"Table turnover doubled. Kitchen is calm. I love my restaurant again.",metric:"2×",ml:"turnover",g:"from-amber-500/50 to-orange-600/40",init:"PM"},
  {name:"Rohan Kapoor",role:"Bella Napoli · Mumbai",q:"AI upsells every dessert. Revenue up 22% in month one.",metric:"+22%",ml:"revenue",g:"from-purple-500/50 to-fuchsia-600/40",init:"RK"},
  {name:"Vikram Shetty",role:"Coastal Grill · Goa",q:"Six outlets, one phone. SmartDine changed everything.",metric:"6",ml:"outlets",g:"from-teal-500/50 to-emerald-600/40",init:"VS"},
];

export function Testimonials() {
  const [active,setActive]=useState<number|null>(null);
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="font-display text-[28px] sm:text-5xl tracking-tight">Real owners. <span className="italic text-gradient-gold">Real results.</span></h2>
          <div className="flex items-center justify-center gap-1 mt-2 text-[12px] text-cream/55">
            <div className="flex text-gold">{Array.from({length:5}).map((_,i)=><StarIcon key={i} className="w-3.5 h-3.5"/>)}</div>
            <span className="ml-1.5">4.9 · 312 owner reviews</span>
          </div>
        </div>

        <div className="sm:hidden -mx-5 px-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-3 pb-3 w-max">
            {TESTI.map((v,i)=><TestiCard key={i} v={v} i={i} onClick={()=>setActive(i)}/>)}
            <div className="w-2 shrink-0"/>
          </div>
          <ScrollDots total={3}/>
        </div>
        <div className="hidden sm:grid sm:grid-cols-3 gap-4">
          {TESTI.map((v,i)=><TestiCard key={i} v={v} i={i} onClick={()=>setActive(i)} desktop/>)}
        </div>
      </div>

      {active!==null&&(
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setActive(null)}>
          <div className="w-full sm:max-w-lg glass-strong rounded-t-3xl sm:rounded-3xl p-6 sm:p-8" onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6 sm:hidden"/>
            <div className={`h-3 rounded-full bg-gradient-to-r ${TESTI[active].g} mb-6`}/>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full glass-strong flex items-center justify-center font-display text-lg">{TESTI[active].init}</div>
              <div><div className="text-sm text-cream">{TESTI[active].name}</div><div className="text-xs text-cream/50">{TESTI[active].role}</div></div>
            </div>
            <p className="font-display text-xl sm:text-2xl text-cream leading-snug">"{TESTI[active].q}"</p>
            <div className="mt-5 flex items-center justify-between">
              <div><div className="font-display text-3xl text-gradient-gold">{TESTI[active].metric}</div><div className="text-[10px] text-cream/50 uppercase tracking-wider">{TESTI[active].ml}</div></div>
              <a href="#demo" className="btn-primary">Book demo <ArrowRight className="w-4 h-4"/></a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TestiCard({v,onClick,desktop}:{v:typeof TESTI[number];i?:number;onClick:()=>void;desktop?:boolean}) {
  return (
    <button onClick={onClick} className={`snap-center shrink-0 ${desktop?"w-auto":"w-[78vw] max-w-[290px]"} group relative aspect-[4/5] rounded-3xl overflow-hidden text-left border border-white/10 hover-lift`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${v.g}`}/>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"/>
      <div className="absolute top-4 right-4 glass-strong rounded-2xl px-3 py-2 text-right">
        <div className="font-display text-xl text-gradient-gold">{v.metric}</div>
        <div className="text-[8px] text-cream/60 uppercase tracking-wider">{v.ml}</div>
      </div>
      <div className="absolute top-4 left-4 w-10 h-10 rounded-full glass-strong flex items-center justify-center font-display">{v.init}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-105 transition">
          <PlayIcon className="w-5 h-5 text-black ml-0.5"/>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-display text-base sm:text-lg leading-snug text-cream">"{v.q}"</p>
        <div className="mt-2 text-[11px] text-cream/60">{v.name} · {v.role}</div>
      </div>
    </button>
  );
}

/* ══════════════════════════════════════════
   FAQ
   ══════════════════════════════════════════ */
export function FAQ() {
  const { t } = useI18n();
  const items=[
    {q:"Do customers need to download an app?",a:"No. They scan the QR and the menu opens instantly in their browser."},
    {q:"How long does setup take?",a:"Our team comes to your restaurant and sets everything up. Ready in 30 minutes."},
    {q:"Does it work without good internet?",a:"Yes. SmartDine works smoothly on any 4G connection."},
    {q:"Is my data safe?",a:"Fully encrypted. Payment-industry compliant. Your data is yours."},
  ];
  const [open,setOpen]=useState<number|null>(null);
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-2xl px-5 sm:px-6">
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[.2em] text-gold/70 mb-2">{t("faq.tag")}</p>
          <h2 className="font-display text-[28px] sm:text-4xl tracking-tight">{t("faq.title")}</h2>
        </div>
        <div className="glass rounded-3xl divide-y divide-white/8">
          {items.map((it,i)=>(
            <button key={i} onClick={()=>setOpen(open===i?null:i)} className="w-full text-left px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] sm:text-base text-cream font-medium">{it.q}</span>
                <span className={`text-gold text-xl shrink-0 transition-transform ${open===i?"rotate-45":""}`}>+</span>
              </div>
              <div className={`grid transition-all duration-300 ${open===i?"grid-rows-[1fr] opacity-100 mt-2":"grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden text-[13px] sm:text-sm text-cream/60 leading-relaxed">{it.a}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   FINAL CTA
   ══════════════════════════════════════════ */
export function FinalCTA() {
  const { t } = useI18n();
  const [submitted,setSubmitted]=useState(false);
  return (
    <section id="demo" className="py-16 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[500px] rounded-full blur-3xl opacity-35" style={{background:"radial-gradient(closest-side,rgba(232,185,107,.4),transparent 70%)"}}/>
      </div>
      <div className="mx-auto max-w-3xl px-5 sm:px-6 text-center">
        <h2 className="font-display text-[38px] sm:text-7xl tracking-tight leading-[1.02]">
          {t("cta.title.1")}<br/><span className="italic text-gradient-gold">{t("cta.title.2")}</span>
        </h2>
        <p className="mt-4 text-[14px] sm:text-base text-cream/65 max-w-md mx-auto">{t("cta.sub")}</p>

        {/* trust row */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-cream/55">
          {["🔒 Secure","🇮🇳 Made in India","⚡ 24h setup","💳 No card needed"].map(x=>(
            <span key={x} className="glass rounded-full px-3 py-1.5">{x}</span>
          ))}
        </div>

        {/* form */}
        <form onSubmit={e=>{e.preventDefault();setSubmitted(true);}} className="mt-7 max-w-md mx-auto glass-strong rounded-2xl p-2 flex flex-col sm:flex-row gap-2">
          {submitted?(
            <div className="w-full text-center py-4">
              <div className="text-gold font-display text-xl">✓ We'll call you within 2 hours!</div>
              <div className="text-[12px] text-cream/60 mt-1">Check WhatsApp for a message from our team.</div>
              <a href="/auth/restaurant" className="btn-primary mt-3 inline-flex items-center justify-center gap-2 text-sm">
                Or Login to Restaurant Portal <ArrowRight className="w-4 h-4"/>
              </a>
            </div>
          ):(
            <>
              <input type="email" required placeholder="your@restaurant.com" className="flex-1 bg-transparent px-4 py-3 text-cream placeholder:text-cream/35 outline-none text-[14px]"/>
              <button type="submit" className="btn-primary justify-center whitespace-nowrap">{t("cta.primary")} <ArrowRight className="w-4 h-4"/></button>
            </>
          )}
        </form>
        <div className="mt-4 text-center">
          <a href="/auth/restaurant" className="text-xs text-gold/80 hover:text-gold underline underline-offset-4">
            Already registered? Login to Restaurant Dashboard →
          </a>
        </div>

        {/* share CTA */}
        <div className="mt-5">
          <a href="https://wa.me/?text=Check%20out%20SmartDine%20AI%20for%20restaurants!%20smartdine.co.in" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[12px] sm:text-sm text-emerald-300 hover:text-emerald-200 transition">
            <svg viewBox="0 0 32 32" className="w-4 h-4" fill="currentColor"><path d="M16 3C9 3 3 9 3 16c0 2.6.9 5 2.4 7L3 29l6.3-2.2c1.9 1 4.1 1.6 6.7 1.6 7 0 13-6 13-13S23 3 16 3z"/></svg>
            Know a restaurant owner? Share SmartDine with them →
          </a>
        </div>
        <p className="mt-4 text-[11px] text-cream/40">{t("cta.note")}</p>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════ */
export function Footer() {
  const productLinks = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how" },
    { label: "Results", href: "#results" },
    { label: "Book demo", href: "#demo" },
    { label: "👩‍🍳 SmartDine Staff", href: "/auth/restaurant" },
    { label: "🏪 Restaurant Partners", href: "/auth/login" },
    { label: "📱 Live Menu Demo", href: "/r/mehfil-hyderabad" },
  ];
  const contactLinks = [
    { label: "📧 admin@smartdineai.co.in", href: "mailto:admin@smartdineai.co.in" },
    { label: "💬 WhatsApp: 83338 71783", href: "https://wa.me/918333871783?text=Hi!%20I%20want%20to%20know%20more%20about%20SmartDine%20AI", external: true },
    { label: "🎯 Book a free demo", href: "#demo" },
  ];
  return (
    <footer className="pt-12 pb-24 sm:pb-10 border-t border-white/5 bg-black/40">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold-bright via-gold to-orange"/>
              <span className="font-display text-xl">SmartDine<span className="text-gold">.</span><span className="text-gradient-ai text-xs align-top ml-0.5">AI</span></span>
            </div>
            <p className="text-[13px] text-cream/55 max-w-xs">The smartest way to run a restaurant. QR menus, AI waiter, live kitchen, analytics.</p>
            <div className="mt-4 flex gap-3 text-[13px] text-cream/50">
              <a href="https://instagram.com/smartdineai" target="_blank" rel="noopener noreferrer" className="hover:text-gold">Instagram</a><span>·</span>
              <a href="https://linkedin.com/company/smartdineai" target="_blank" rel="noopener noreferrer" className="hover:text-gold">LinkedIn</a><span>·</span>
              <a href="https://youtube.com/@smartdineai" target="_blank" rel="noopener noreferrer" className="hover:text-gold">YouTube</a>
            </div>
          </div>
          <div>
            <div className="text-[13px] font-medium text-cream/80 mb-3">Product</div>
            <ul className="space-y-2">
              {productLinks.map(x => (
                <li key={x.label}>
                  <a href={x.href} className="text-[13px] text-cream/45 hover:text-cream transition">{x.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[13px] font-medium text-cream/80 mb-3">Contact</div>
            <ul className="space-y-2">
              {contactLinks.map(x => (
                <li key={x.label}>
                  <a
                    href={x.href}
                    {...(x.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="text-[13px] text-cream/45 hover:text-gold transition break-all"
                  >
                    {x.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-cream/40">
          <span>© 2026 SmartDine AI · smartdine.co.in</span>
          <span>Made with ❤️ for restaurants in India</span>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════
   REAL STORIES — combined results, testimonials, and objections
   ══════════════════════════════════════════ */
export function RealStories() {
  const [activeTesti, setActiveTesti] = useState<number | null>(null);

  const stats = [
    { v: 500, s: "+", l: "Restaurants" },
    { v: 12, s: "M+", l: "Orders" },
    { v: 32, s: "%", l: "Avg revenue lift" },
  ];

  const TESTI = [
    { name: "Priya Menon", role: "Saffron House · Bengaluru", q: "Table turnover doubled. The kitchen is finally calm. I love my restaurant again.", metric: "2×", ml: "turnover", g: "from-amber-500/50 to-orange-600/40", init: "PM" },
    { name: "Rohan Kapoor", role: "Bella Napoli · Mumbai", q: "Average order value jumped 22% in the first month. The AI just works.", metric: "+22%", ml: "order value", g: "from-purple-500/50 to-fuchsia-600/40", init: "RK" },
    { name: "Vikram Shetty", role: "Coastal Grill · Goa", q: "I run 6 outlets from my phone now. SmartDine changed our business.", metric: "6", ml: "outlets", g: "from-teal-500/50 to-emerald-600/40", init: "VS" },
  ];

  return (
    <section className="py-14 sm:py-24 relative">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        {/* header */}
        <div className="text-center mb-10">
          <h2 className="font-display text-[32px] sm:text-5xl tracking-tight leading-tight">
            Real owners. <span className="italic text-gradient-gold">Real results.</span>
          </h2>
          <div className="flex items-center justify-center gap-1 mt-3 text-xs text-cream/55">
            <div className="flex text-gold">{Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} className="w-3.5 h-3.5" />)}</div>
            <span className="ml-2">4.9 · 312 owner reviews</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="glass rounded-2xl py-5 text-center hover-lift">
              <div className="font-display text-3xl sm:text-4xl text-gradient-gold">{s.v}{s.s}</div>
              <div className="text-[10px] text-cream/50 mt-1 uppercase tracking-wider">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Testimonial cards — swipe on mobile */}
        <div className="sm:hidden -mx-5 px-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-3 pb-4 w-max">
            {TESTI.map((v, i) => (
              <button
                key={i}
                onClick={() => setActiveTesti(i)}
                className="snap-center shrink-0 w-[78vw] max-w-[290px] group relative aspect-[4/5] rounded-3xl overflow-hidden text-left border border-white/10 hover-lift"
              >
                <TestiCardContent v={v} />
              </button>
            ))}
            <div className="w-4 shrink-0" />
          </div>
          <ScrollDots total={3} />
        </div>

        {/* Desktop grid */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-4">
          {TESTI.map((v, i) => (
            <button
              key={i}
              onClick={() => setActiveTesti(i)}
              className="group relative aspect-[4/5] rounded-3xl overflow-hidden text-left hover-lift border border-white/10"
            >
              <TestiCardContent v={v} />
            </button>
          ))}
        </div>

        {/* Objections / FAQ style */}
        <div className="mt-12 sm:mt-16 glass rounded-3xl p-5 sm:p-8">
          <p className="text-center text-xs uppercase tracking-widest text-gold/70 mb-4">We know what you're thinking</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { worry: "My customers aren't tech-savvy", fix: "Just scan a QR. No app. Works on any phone." },
              { worry: "Setup sounds complicated", fix: "Our team comes to your restaurant. Ready in 30 minutes." },
              { worry: "What if internet goes down?", fix: "SmartDine keeps working on 4G. No problem." },
            ].map((ob, i) => (
              <div key={i} className="glass-strong rounded-2xl p-4 text-[13px]">
                <div className="flex items-center gap-2 text-red/70 mb-2">
                  <XIcon className="w-3 h-3" /> {ob.worry}
                </div>
                <div className="flex items-start gap-2 text-cream/85">
                  <CheckIcon className="w-4 h-4 text-gold shrink-0 mt-0.5" /> {ob.fix}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonial modal */}
      {activeTesti !== null && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center p-4"
          onClick={() => setActiveTesti(null)}
        >
          <div
            className="w-full max-w-lg glass-strong rounded-t-3xl sm:rounded-3xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6 sm:hidden" />
            <div className={`h-2 rounded-full bg-gradient-to-r ${TESTI[activeTesti].g} mb-6`} />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full glass-strong flex items-center justify-center font-display text-xl">
                {TESTI[activeTesti].init}
              </div>
              <div>
                <div className="text-sm text-cream">{TESTI[activeTesti].name}</div>
                <div className="text-xs text-cream/50">{TESTI[activeTesti].role}</div>
              </div>
            </div>
            <p className="font-display text-xl leading-snug text-cream">"{TESTI[activeTesti].q}"</p>
            <div className="mt-6 flex items-center justify-between">
              <div>
                <div className="font-display text-4xl text-gradient-gold">{TESTI[activeTesti].metric}</div>
                <div className="text-xs text-cream/50 uppercase tracking-wider">{TESTI[activeTesti].ml}</div>
              </div>
              <a href="#demo" className="btn-primary">Book demo <ArrowRight className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TestiCardContent({ v }: { v: any }) {
  return (
    <>
      {/* Solid dark card with subtle accent gradient at top */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #15141c 0%, #0d0c12 100%)" }} />
      <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${v.g}`} />
      <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${v.g} blur-3xl opacity-30`} />

      {/* Content — clean text testimonial */}
      <div className="absolute inset-0 flex flex-col p-5">
        {/* Stars */}
        <div className="flex gap-0.5 text-gold mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon key={i} className="w-3.5 h-3.5" />
          ))}
        </div>

        {/* Big quote mark */}
        <div className={`font-display text-5xl leading-none bg-gradient-to-br ${v.g} bg-clip-text text-transparent`}>"</div>

        {/* Quote text */}
        <p className="font-display text-[16px] sm:text-lg leading-snug text-cream flex-1 -mt-2">
          {v.q}
        </p>

        {/* Metric highlight */}
        <div className="mb-4">
          <div className="font-display text-3xl sm:text-4xl text-gradient-gold leading-none">{v.metric}</div>
          <div className="text-[10px] text-cream/55 uppercase tracking-wider mt-1">{v.ml}</div>
        </div>

        {/* Author */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/10">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${v.g} flex items-center justify-center font-display text-sm text-white shadow-lg`}>
            {v.init}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] text-cream font-medium leading-tight">{v.name}</div>
            <div className="text-[11px] text-cream/55 leading-tight truncate">{v.role}</div>
          </div>
        </div>
      </div>
    </>
  );
}


/* ══════════════════════════════════════════
   STICKY CTA + BOTTOM NAV
   ══════════════════════════════════════════ */
export function StickyCTA() {
  const { t } = useI18n();
  const [show,setShow]=useState(false);
  useEffect(()=>{
    const fn=()=>setShow(window.scrollY>500);
    fn(); window.addEventListener("scroll",fn,{passive:true});
    return()=>window.removeEventListener("scroll",fn);
  },[]);
  return (
    <div className={`hidden sm:flex fixed bottom-5 right-5 z-40 transition-all duration-500 ${show?"opacity-100 translate-y-0":"opacity-0 translate-y-4 pointer-events-none"}`}>
      <a href="#demo" className="btn-primary shadow-2xl">
        <PlayIcon className="w-4 h-4"/> {t("sticky.cta")}
      </a>
    </div>
  );
}

/* Mobile bottom nav */
export function BottomNav() {
  const [active,setActive]=useState("home");
  const [show,setShow]=useState(false);
  useEffect(()=>{
    const fn=()=>setShow(window.scrollY>100);
    fn(); window.addEventListener("scroll",fn,{passive:true});
    return()=>window.removeEventListener("scroll",fn);
  },[]);
  const tabs=[
    {id:"home",icon:"🏠",label:"Home",href:"#top"},
    {id:"features",icon:"✨",label:"Features",href:"#how"},
    {id:"demo",icon:"🎯",label:"Demo",href:"#demo",primary:true},
    {id:"wa",icon:"💬",label:"Chat",href:"https://wa.me/918333871783?text=Hi!%20I%20want%20to%20know%20more%20about%20SmartDine%20AI"},
  ];
  return (
    <div className={`sm:hidden bottom-nav transition-all duration-500 ${show?"translate-y-0 opacity-100":"translate-y-full opacity-0"}`} style={{background:"rgba(10,10,16,.95)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)"}}>
      <div className="flex items-center justify-around px-4 py-2">
        {tabs.map(tab=>(
          <a key={tab.id} href={tab.href} onClick={()=>setActive(tab.id)} target={tab.href.startsWith("http")?"_blank":undefined} rel="noopener noreferrer"
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all ${tab.primary?"bg-gradient-to-br from-gold to-orange text-black -mt-3 px-5 py-2.5 shadow-[0_8px_24px_rgba(232,185,107,.5)]":active===tab.id?"text-gold":"text-cream/70"}`}>
            <span className="text-xl">{tab.icon}</span>
            <span className={`text-[9px] font-medium ${tab.primary?"text-black":""}`}>{tab.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Scroll dots indicator ── */
function ScrollDots({total}:{total:number}) {
  return (
    <div className="flex justify-center gap-1.5 mt-3">
      {Array.from({length:total}).map((_, idx)=>(
        <div key={idx} className={`h-1 rounded-full bg-cream/25 transition-all ${idx===0?"w-5 bg-gold":""}`}/>
      ))}
    </div>
  );
}

export { BoltIcon, StarIcon };
