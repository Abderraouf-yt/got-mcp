import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ==========================================
// A. NAVBAR 
// ==========================================
function Navbar() {
  const navRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 'top -50',
        end: 99999,
        toggleClass: { className: 'bg-void/80 backdrop-blur-xl border-white/5', targets: navRef.current },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <nav ref={navRef} className="fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b border-transparent py-4 px-6 md:px-12 flex items-center justify-between">
      <div className="flex items-center gap-2 text-ghost font-bold text-xl tracking-tight">
        <div className="w-5 h-5 bg-plasma/20 border border-plasma rounded-sm flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-plasma rounded-sm animate-pulse"></div>
        </div>
        <span>GoT <span className="text-plasma">MCP</span></span>
      </div>
      <div className="hidden md:flex items-center gap-10 text-xs font-mono uppercase tracking-[0.1em] text-ghost/60">
        <a href="#features" className="hover:text-plasma transition-colors">Artifacts</a>
        <a href="#protocol" className="hover:text-plasma transition-colors">Protocol</a>
        <a href="#pricing" className="hover:text-plasma transition-colors">Scale</a>
      </div>
      <div className="flex items-center gap-6">
        <a href="https://github.com/Abderraouf-yt/got-mcp" target="_blank" rel="noreferrer" className="text-xs font-mono uppercase tracking-widest text-ghost hover:text-plasma transition-colors">GitHub</a>
        <a href="#pricing" className="group relative overflow-hidden bg-plasma text-void px-6 py-2.5 rounded-sm font-bold text-xs uppercase tracking-widest transition-transform hover:scale-[1.03] active:scale-95">
          <span className="relative z-10">Deploy Node</span>
          <div className="absolute inset-0 bg-white translate-y-full transition-transform group-hover:translate-y-0 duration-300"></div>
        </a>
      </div>
    </nav>
  );
}

// ==========================================
// B. HERO SECTION
// ==========================================
function Hero() {
  const container = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-elem', {
        y: 40,
        opacity: 0,
        duration: 1.2,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.2
      });
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={container} className="relative w-full h-[100dvh] flex items-end pb-32 px-6 md:px-12 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-plasma/10 via-void to-void z-0 pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl w-full">
        <div className="hero-elem inline-flex items-center gap-2 px-3 py-1 border border-plasma/30 bg-plasma/5 text-plasma font-mono text-[10px] uppercase tracking-[0.2em] mb-10">
          <span className="w-1.5 h-1.5 bg-plasma rounded-none animate-pulse"></span>
          Controller Loop Active [v4.0.0]
        </div>

        <h1 className="hero-elem flex flex-col gap-0 mb-10">
          <span className="font-sora font-medium text-4xl md:text-6xl text-ghost leading-tight tracking-tight">
            Cognition beyond
          </span>
          <span className="font-drama text-7xl md:text-[9rem] text-plasma leading-[0.8] tracking-tighter">
            algorithmic limits.
          </span>
        </h1>

        <p className="hero-elem font-mono text-sm md:text-base text-ghost/50 max-w-2xl mb-12 leading-relaxed text-balance">
          The autonomous MCP server that equips agents with non-linear Graph of Thoughts reasoning.
          Seed vectors, execute branching realities, prune dead ends, and enforce global convergence.
        </p>

        <div className="hero-elem flex flex-wrap items-center gap-4">
          <a href="#pricing" className="group relative overflow-hidden bg-plasma text-void px-8 py-4 rounded-sm font-bold text-xs uppercase tracking-widest transition-transform hover:scale-[1.03] active:scale-95 flex items-center gap-4">
            <span className="relative z-10 flex items-center gap-3">
              Initialize Scale <span className="text-[10px]">↗</span>
            </span>
            <div className="absolute inset-0 bg-white translate-y-full transition-transform group-hover:translate-y-0 duration-300"></div>
          </a>
          <a href="https://www.npmjs.com/package/@abderraouf-yt/got-mcp" target="_blank" rel="noreferrer" className="px-8 py-4 rounded-sm border border-white/10 font-mono text-xs uppercase tracking-widest text-ghost/60 hover:border-plasma hover:text-plasma transition-all">
            npm install @abderraouf-yt/got-mcp
          </a>
        </div>
      </div>

      <div className="hero-elem absolute right-0 top-[15%] w-[55vw] h-[70vh] opacity-30 pointer-events-none hidden lg:block">
        <div className="w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_80%,transparent_100%)]"></div>
        <div className="absolute top-[60px] left-[180px] w-1.5 h-1.5 bg-plasma shadow-[0_0_20px_var(--tw-colors-plasma)] animate-pulse"></div>
        <div className="absolute top-[300px] left-[420px] w-1.5 h-1.5 bg-ghost shadow-[0_0_15px_#fff]"></div>
        <div className="absolute top-[480px] left-[120px] w-1.5 h-1.5 bg-red-500 shadow-[0_0_15px_red] opacity-60"></div>
        {/* Minimalist SVG connections */}
        <svg className="absolute inset-0 w-full h-full" stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none">
          <path d="M180,60 L420,300 L120,480" strokeDasharray="4 4" />
        </svg>
      </div>
    </section>
  );
}

// ==========================================
// C. FEATURES (Interactive Functional Artifacts)
// ==========================================
function Features() {
  const container = useRef(null);
  const [shuffleItems, setShuffleItems] = useState(['[01] PROPOSE', '[02] CRITIQUE', '[03] CONVERGE']);
  const [textFeed, setTextFeed] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setShuffleItems(prev => {
        const newArr = [...prev];
        const last = newArr.pop();
        newArr.unshift(last);
        return newArr;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fullText = "> eval node_x29e\n[RES] confidence: 0.94\n> prune depth 4\n[SYS] path discarded\n> converge";
    let i = 0;
    const interval = setInterval(() => {
      setTextFeed(fullText.substring(0, i));
      i++;
      if (i > fullText.length) {
        setTimeout(() => { i = 0; }, 2000);
      }
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="features" ref={container} className="py-32 px-6 md:px-12 max-w-7xl mx-auto border-t border-white/5">
      <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="font-mono text-plasma text-[10px] uppercase tracking-[0.3em] mb-4">Functional Artifacts</h2>
          <h3 className="font-sora text-3xl md:text-5xl font-light tracking-tight text-white/90">Instrumentation.</h3>
        </div>
        <p className="font-mono text-xs text-ghost/40 max-w-xs uppercase tracking-widest leading-loose">
          Visualizing internal cognitive states via 16 dedicated tool endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-1">

        {/* Card 1: Diagnostic Shuffler */}
        <div className="bg-[#0A0A0F] border border-white/5 p-10 flex flex-col group hover:bg-[#0C0C14] transition-colors duration-500 h-[28rem]">
          <div className="mb-auto">
            <div className="font-mono text-[10px] text-plasma uppercase tracking-widest mb-6">Autonomous Loops</div>
            <h4 className="font-sora text-2xl font-light mb-3">Recursive<br />Discovery</h4>
            <p className="text-white/40 font-mono text-[10px] leading-relaxed">Agentic loops continuously propose, score, and branch without human intervention.</p>
          </div>
          <div className="relative h-40 mt-8">
            {shuffleItems.map((item, i) => (
              <div
                key={item}
                className="absolute w-full p-4 bg-void border border-white/10 font-mono text-[10px] text-plasma/80 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  transform: `translateY(${i * 16}px) scale(${1 - i * 0.04})`,
                  opacity: 1 - i * 0.4,
                  zIndex: 3 - i
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Telemetry Typewriter */}
        <div className="bg-[#0A0A0F] border border-white/5 p-10 flex flex-col group hover:bg-[#0C0C14] transition-colors duration-500 h-[28rem]">
          <div className="mb-auto flex justify-between items-start">
            <div>
              <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-6">Trace Export</div>
              <h4 className="font-sora text-2xl font-light mb-3">Real-time<br />Telemetry</h4>
              <p className="text-white/40 font-mono text-[10px] leading-relaxed">DeepSeek-R1 compatible structured trace outputs for post-hoc analysis.</p>
            </div>
          </div>
          <div className="h-40 mt-8 p-5 bg-black border border-white/5 font-mono text-[10px] text-white/70 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2 text-[8px] text-plasma animate-pulse">LIVE</div>
            <pre className="whitespace-pre-wrap leading-relaxed">{textFeed}<span className="inline-block w-1.5 h-3 bg-plasma ml-1 align-middle"></span></pre>
          </div>
        </div>

        {/* Card 3: Cursor Protocol Scheduler */}
        <div className="bg-[#0A0A0F] border border-white/5 p-10 flex flex-col group hover:bg-[#0C0C14] transition-colors duration-500 h-[28rem]">
          <div className="mb-auto">
            <div className="font-mono text-[10px] text-red-400 uppercase tracking-widest mb-6">Thresholds</div>
            <h4 className="font-sora text-2xl font-light mb-3">Governance<br />Controls</h4>
            <p className="text-white/40 font-mono text-[10px] leading-relaxed">Absolute deterministic limits to prevent token exhaustion and hallcinatory spirals.</p>
          </div>
          <div className="h-40 mt-8 bg-black border border-white/5 p-5 flex flex-col gap-3 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="font-mono text-[9px] text-white/30">MAX_ITERATIONS</span>
              <span className="font-mono text-[10px] text-plasma">5</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="font-mono text-[9px] text-white/30">CONVERGE_THRESH</span>
              <span className="font-mono text-[10px] text-plasma">0.85</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="font-mono text-[9px] text-white/30">PRUNE_BELOW</span>
              <span className="font-mono text-[10px] text-red-500">0.30</span>
            </div>
            <div className="absolute top-0 left-0 w-full h-px bg-plasma/50 shadow-[0_0_15px_var(--tw-colors-plasma)] animate-[scan_2.5s_ease-in-out_infinite]"></div>
          </div>
        </div>

      </div>
    </section>
  );
}

// ==========================================
// D. PHILOSOPHY
// ==========================================
function Philosophy() {
  const textRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.philo-line', {
        scrollTrigger: {
          trigger: textRef.current,
          start: 'top 75%',
        },
        y: 40,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power3.out'
      });
    }, textRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative w-full py-48 px-6 md:px-12 bg-black border-y border-white/5 overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1618044733300-9472054094ee?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center grayscale mix-blend-screen"></div>

      <div ref={textRef} className="relative z-10 max-w-5xl mx-auto flex flex-col gap-16">
        <p className="philo-line font-mono text-sm md:text-lg text-white/30 leading-relaxed max-w-2xl tracking-widest uppercase">
          Most LLM systems rely on <span className="text-white/60 line-through decoration-red-500/50">linear statistical auto-completion</span>.
        </p>
        <p className="philo-line font-drama text-5xl md:text-8xl text-ghost leading-[0.85] tracking-tight">
          We demand <br />
          <span className="text-plasma italic pr-6 tracking-tighter">multi-dimensional state.</span>
        </p>
      </div>
    </section>
  );
}

// ==========================================
// E. PROTOCOL (Sticky Stacking Archive)
// ==========================================
function Protocol() {
  const container = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card, i) => {
        if (i === cardsRef.current.length - 1) return;
        ScrollTrigger.create({
          trigger: card,
          start: 'top 15%',
          endTrigger: container.current,
          end: 'bottom bottom',
          pin: true,
          pinSpacing: false,
          scrub: true,
          animation: gsap.to(card, {
            scale: 0.92,
            opacity: 0.2,
            filter: 'blur(12px)',
            ease: 'none'
          })
        });
      });
    }, container);
    return () => ctx.revert();
  }, []);

  const steps = [
    {
      num: '01',
      title: 'Generative Expansion',
      desc: 'The agent proposes multiple divergent pathways simultaneously, breaking out of single-thread hallucination loops.',
      visual: (
        <svg viewBox="0 0 100 100" className="w-full h-full text-plasma stroke-current fill-none">
          <circle cx="50" cy="80" r="4" fill="currentColor" />
          <path d="M50 80 L20 40 M50 80 L50 40 M50 80 L80 40" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="20" cy="40" r="3" />
          <circle cx="50" cy="40" r="3" />
          <circle cx="80" cy="40" r="3" />
        </svg>
      )
    },
    {
      num: '02',
      title: 'Reflective Critique',
      desc: 'Each node undergoes rigorous self-evaluation, generating a 4-axis confidence vector to score logical coherence.',
      visual: (
        <svg viewBox="0 0 100 100" className="w-full h-full text-ghost/60 stroke-current fill-none">
          <rect x="20" y="20" width="60" height="60" strokeWidth="1" />
          <path d="M20 50 L80 50 M50 20 L50 80" strokeWidth="0.5" strokeDasharray="1 3" />
          <circle cx="65" cy="35" r="2" fill="currentColor" />
        </svg>
      )
    },
    {
      num: '03',
      title: 'Pruning & Convergence',
      desc: 'Sub-threshold branches are violently severed. The system continuously forces the graph toward the optimal, ground-truth solution.',
      visual: (
        <svg viewBox="0 0 100 100" className="w-full h-full text-red-500 stroke-current fill-none">
          <circle cx="50" cy="20" r="5" fill="currentColor" />
          <path d="M50 80 L50 20" strokeWidth="2" />
          <path d="M50 60 L20 40" strokeWidth="1" opacity="0.2" />
          <line x1="15" y1="35" x2="30" y2="45" stroke="#E63B2E" strokeWidth="2" />
          <line x1="30" y1="35" x2="15" y2="45" stroke="#E63B2E" strokeWidth="2" />
        </svg>
      )
    }
  ];

  return (
    <section id="protocol" ref={container} className="relative w-full py-48 px-6 md:px-12 flex flex-col items-center">
      <div className="w-full max-w-4xl mb-32">
        <h2 className="font-drama text-6xl md:text-[6rem] text-ghost leading-none tracking-tighter">Protocol.</h2>
      </div>

      {steps.map((step, i) => (
        <div
          key={i}
          ref={el => cardsRef.current[i] = el}
          className="w-full max-w-4xl h-[60vh] md:h-[45vh] bg-[#07070A] border border-white/5 p-12 mb-16 last:mb-0 flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden shadow-2xl relative"
        >
          <div className="flex flex-col gap-8 relative z-10 max-w-md w-full">
            <span className="font-mono text-plasma text-sm border-b border-white/10 pb-4 inline-block w-8">{step.num}</span>
            <h3 className="font-sora text-3xl font-light tracking-tight">{step.title}</h3>
            <p className="font-mono text-[10px] uppercase tracking-widest leading-loose text-white/40">{step.desc}</p>
          </div>

          <div className="relative z-10 w-48 h-48 border border-white/5 bg-black p-8 flex items-center justify-center shrink-0 hidden md:flex">
            {step.visual}
          </div>
        </div>
      ))}
    </section>
  );
}

// ==========================================
// F. PRICING (Monetization & Audiences)
// ==========================================
function Pricing() {
  return (
    <section id="pricing" className="py-40 px-6 md:px-12 max-w-7xl mx-auto border-t border-white/5">
      <div className="mb-24 md:flex justify-between items-end">
        <div>
          <h2 className="font-mono text-plasma text-[10px] uppercase tracking-[0.3em] mb-4">Infrastructure</h2>
          <h3 className="font-drama text-5xl md:text-7xl text-ghost leading-none">Scale Cognition.</h3>
        </div>
        <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest max-w-sm leading-loose mt-8 md:mt-0 text-balance">
          Select the architecture that matches your operational requirements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/5 bg-void">

        {/* Tier 1: Researchers / Hobbyists */}
        <div className="p-10 border-b md:border-b-0 md:border-r border-white/5 flex flex-col hover:bg-white/[0.02] transition-colors">
          <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest mb-8">Target: Solo Engineers</div>
          <h3 className="font-sora text-2xl font-light mb-2">Local Core</h3>
          <div className="font-mono text-3xl text-ghost mb-8 border-b border-white/5 pb-8">$0<span className="text-xs text-white/30">/mo</span></div>

          <div className="mb-auto">
            <p className="font-mono text-[10px] uppercase text-plasma mb-4">Pain Relieved:</p>
            <p className="font-mono text-[10px] text-white/40 leading-relaxed mb-8 pr-4">
              Stop relying on brittle, linear completions. Run a full reasoning loop locally attached to your IDE.
            </p>
            <ul className="flex flex-col gap-4 text-[10px] font-mono uppercase tracking-wider text-white/60">
              <li className="flex items-center gap-3"><span className="w-1 h-1 bg-plasma rounded-none"></span> Stdio Transport</li>
              <li className="flex items-center gap-3"><span className="w-1 h-1 bg-plasma rounded-none"></span> 16 Tools Access</li>
              <li className="flex items-center gap-3"><span className="w-1 h-1 bg-white/20 rounded-none"></span> Local JSON State</li>
            </ul>
          </div>

          <a href="https://github.com/Abderraouf-yt/got-mcp" target="_blank" rel="noreferrer" className="mt-12 block w-full py-4 text-center border border-white/10 font-mono text-[10px] uppercase tracking-widest hover:border-plasma hover:text-plasma transition-colors">
            View Repository
          </a>
        </div>

        {/* Tier 2: AI Startups / Dev Teams */}
        <div className="p-10 border-b md:border-b-0 md:border-r border-white/5 flex flex-col bg-[#0A0A0E] relative overflow-hidden group">
          <div className="absolute top-0 right-0 px-3 py-1 bg-plasma font-mono text-[8px] uppercase tracking-[0.2em] text-void font-bold">Standard</div>
          <div className="absolute inset-0 bg-gradient-to-b from-plasma/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

          <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest mb-8 relative z-10">Target: Dev Teams</div>
          <h3 className="font-sora text-2xl font-light mb-2 relative z-10">Cloud Sandbox</h3>
          <div className="font-mono text-4xl text-plasma mb-8 border-b border-white/5 pb-8 relative z-10">$49<span className="text-xs text-white/30">/mo</span></div>

          <div className="mb-auto relative z-10">
            <p className="font-mono text-[10px] uppercase text-plasma mb-4">Pain Relieved:</p>
            <p className="font-mono text-[10px] text-white/40 leading-relaxed mb-8 pr-4">
              Offload intensive 100+ node graph traversals from local compute. Share contextual memory across your team's fleet.
            </p>
            <ul className="flex flex-col gap-4 text-[10px] font-mono uppercase tracking-wider text-white/80">
              <li className="flex items-center gap-3"><span className="w-1 h-1 bg-plasma rounded-none"></span> Serverless REST Bridge</li>
              <li className="flex items-center gap-3"><span className="w-1 h-1 bg-plasma rounded-none"></span> 100,000 Graph Nodes</li>
              <li className="flex items-center gap-3"><span className="w-1 h-1 bg-plasma rounded-none"></span> Visualizer Dashboard</li>
            </ul>
          </div>

          <button className="mt-12 w-full py-4 bg-plasma text-void font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors relative z-10">
            Initialize Free Trial
          </button>
        </div>

        {/* Tier 3: Enterprise */}
        <div className="p-10 flex flex-col hover:bg-white/[0.02] transition-colors">
          <div className="font-mono text-[10px] text-white/50 uppercase tracking-widest mb-8">Target: Enterprise</div>
          <h3 className="font-sora text-2xl font-light mb-2">Scale Cluster</h3>
          <div className="font-mono text-3xl text-ghost mb-8 border-b border-white/5 pb-8">Custom<span className="text-xs text-transparent">/mo</span></div>

          <div className="mb-auto">
            <p className="font-mono text-[10px] uppercase text-plasma mb-4">Pain Relieved:</p>
            <p className="font-mono text-[10px] text-white/40 leading-relaxed mb-8 pr-4">
              Total data isolation. Integrate the protocol within SOC2 compliant VPCs with zero rate limits.
            </p>
            <ul className="flex flex-col gap-4 text-[10px] font-mono uppercase tracking-wider text-white/60">
              <li className="flex items-center gap-3"><span className="w-1 h-1 bg-plasma rounded-none"></span> SOC2 / HIPAA VPC Peering</li>
              <li className="flex items-center gap-3"><span className="w-1 h-1 bg-plasma rounded-none"></span> Infinite Node Cap</li>
              <li className="flex items-center gap-3"><span className="w-1 h-1 bg-plasma rounded-none"></span> Model Fine-Tuning Eng</li>
            </ul>
          </div>

          <button className="mt-12 w-full py-4 border border-white/10 font-mono text-[10px] uppercase tracking-widest hover:border-ghost transition-colors">
            Protocol Briefing
          </button>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// G. FOOTER
// ==========================================
function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5 pt-16 pb-12 px-6 md:px-12 bg-black">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12 mb-16 border-b border-white/5 pb-16">
        <div>
          <div className="flex items-center gap-3 text-ghost font-bold text-2xl tracking-tight mb-4">
            <div className="w-6 h-6 border-[1.5px] border-plasma flex items-center justify-center">
              <div className="w-2 h-2 bg-plasma"></div>
            </div>
            <span>GoT <span className="text-plasma">MCP</span></span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 max-w-sm leading-loose">
            High-fidelity deterministic reasoning infrastructure for autonomous agents.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-16 font-mono text-[10px] uppercase tracking-widest text-ghost/50">
          <div className="flex flex-col gap-6">
            <a href="https://www.npmjs.com/package/@abderraouf-yt/got-mcp" target="_blank" rel="noreferrer" className="hover:text-plasma transition-colors">NPM Package</a>
            <a href="https://github.com/Abderraouf-yt/got-mcp" target="_blank" rel="noreferrer" className="hover:text-plasma transition-colors">GitHub Source</a>
            <a href="#" className="hover:text-plasma transition-colors">Platform Docs</a>
          </div>
          <div className="flex flex-col gap-6">
            <a href="#" className="hover:text-plasma transition-colors">Security</a>
            <a href="#" className="hover:text-plasma transition-colors">Privacy</a>
            <a href="mailto:ops@thoughtgraph.io" className="hover:text-plasma transition-colors">Contact Ops</a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex justify-between items-center text-[9px] text-white/20 font-mono uppercase tracking-[0.2em]">
        <div>© 2026 Abderraouf. MIT License.</div>
        <div className="flex items-center gap-3">
          <span className="w-1 h-1 bg-green-500 animate-pulse"></span>
          NETWORK STABLE
        </div>
      </div>
    </footer>
  );
}

// ==========================================
// MAIN APP COMPONENT
// ==========================================
function App() {
  return (
    <div className="min-h-screen text-ghost font-sora selection:bg-plasma/30">
      <Navbar />
      <Hero />
      <Features />
      <Philosophy />
      <Protocol />
      <Pricing />
      <Footer />

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: 100%; }
        }
      `}} />
    </div>
  );
}

export default App;
