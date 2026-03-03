import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, BrainCircuit, Network, Scissors, Combine, Database, Terminal, Settings, Check } from 'lucide-react';

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
      <div className="flex items-center gap-2 text-ghost font-bold text-lg tracking-tight">
        <BrainCircuit className="text-plasma w-6 h-6" />
        <span>GoT <span className="text-plasma">MCP</span></span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ghost/60">
        <a href="#features" className="hover:text-plasma transition-colors">Capabilities</a>
        <a href="#protocol" className="hover:text-plasma transition-colors">Protocol</a>
        <a href="#pricing" className="hover:text-plasma transition-colors">Pricing</a>
      </div>
      <div className="flex items-center gap-4">
        <a href="https://github.com/Abderraouf-yt/got-mcp" target="_blank" rel="noreferrer" className="text-sm font-medium text-ghost hover:text-plasma transition-colors">GitHub</a>
        <button className="group relative overflow-hidden bg-plasma text-void px-5 py-2 rounded-full font-bold text-sm transition-transform hover:scale-105 active:scale-95">
          <span className="relative z-10">Get Started</span>
          <div className="absolute inset-0 bg-white translate-y-full transition-transform group-hover:translate-y-0 duration-300"></div>
        </button>
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
    <section ref={container} className="relative w-full h-[100dvh] flex items-end pb-24 px-6 md:px-12 overflow-hidden">
      {/* Background Gradient & Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-plasma/20 via-void to-void z-0"></div>

      <div className="relative z-10 max-w-4xl w-full">
        <div className="hero-elem inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-plasma/30 bg-plasma/10 text-plasma font-mono text-xs uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-plasma animate-pulse"></span>
          v4.0 Controller Loop Active
        </div>

        <h1 className="hero-elem flex flex-col gap-2 mb-8">
          <span className="font-sora font-extrabold text-4xl md:text-6xl text-ghost leading-tight tracking-tight">
            AI reasoning beyond
          </span>
          <span className="font-drama text-6xl md:text-[8rem] text-plasma leading-[0.8] tracking-tighter pr-4">
            human limits.
          </span>
        </h1>

        <p className="hero-elem font-sora text-lg md:text-xl text-ghost/60 max-w-2xl mb-10 leading-relaxed text-balance">
          The only MCP server that gives AI agents non-linear reasoning. Seed, evaluate, branch, reflect, prune, and converge autonomously.
        </p>

        <div className="hero-elem flex flex-wrap items-center gap-4">
          <button className="group relative overflow-hidden bg-plasma text-void px-8 py-4 rounded-[2rem] font-bold text-sm transition-transform hover:scale-105 active:scale-95 flex items-center gap-2">
            <span className="relative z-10 flex items-center gap-2">Install Package <ArrowRight className="w-4 h-4" /></span>
            <div className="absolute inset-0 bg-white translate-y-full transition-transform group-hover:translate-y-0 duration-300"></div>
          </button>
          <button className="px-8 py-4 rounded-[2rem] border border-white/10 font-bold text-sm hover:border-plasma hover:text-plasma transition-all">
            Read Documentation
          </button>
        </div>
      </div>

      {/* Decorative Grid */}
      <div className="hero-elem absolute right-0 top-[20%] w-[50vw] h-[60vh] opacity-20 pointer-events-none hidden lg:block">
        <div className="w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-[40px] left-[120px] w-2 h-2 bg-plasma rounded-full shadow-[0_0_20px_var(--tw-colors-plasma)]"></div>
        <div className="absolute top-[200px] left-[280px] w-2 h-2 bg-ghost rounded-full shadow-[0_0_15px_#fff]"></div>
        <div className="absolute top-[320px] left-[80px] w-2 h-2 bg-red-500 rounded-full shadow-[0_0_15px_red]"></div>
      </div>
    </section>
  );
}

// ==========================================
// C. FEATURES (Interactive Functional Artifacts)
// ==========================================
function Features() {
  const container = useRef(null);
  const [shuffleItems, setShuffleItems] = useState(['1. Generate', '2. Evaluate', '3. Converge']);
  const [textFeed, setTextFeed] = useState('');

  // Card 1: Diagnostic Shuffler
  useEffect(() => {
    const interval = setInterval(() => {
      setShuffleItems(prev => {
        const newArr = [...prev];
        const last = newArr.pop();
        newArr.unshift(last);
        return newArr;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Card 2: Telemetry Typewriter
  useEffect(() => {
    const fullText = "[SYSTEM] Evaluating Branch A2...\n[ASSERT] Logical coherence: 0.94\n[ACTION] Pruning path B1\n[SYSTEM] Convergence threshold met.";
    let i = 0;
    const interval = setInterval(() => {
      setTextFeed(fullText.substring(0, i));
      i++;
      if (i > fullText.length) {
        setTimeout(() => { i = 0; }, 2000);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="features" ref={container} className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="mb-20">
        <h2 className="font-mono text-plasma text-sm uppercase tracking-[0.2em] mb-4">Functional Artifacts</h2>
        <h3 className="font-sora text-3xl md:text-5xl font-extrabold tracking-tight">Tools of Precision.</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: Diagnostic Shuffler */}
        <div className="relative overflow-hidden bg-graphite/40 border border-white/5 rounded-[2rem] p-8 aspect-square flex flex-col group hover:border-plasma/30 transition-colors duration-500">
          <div className="mb-auto">
            <Combine className="w-8 h-8 text-plasma mb-4" />
            <h4 className="text-xl font-bold mb-2">Autonomous Discovery</h4>
            <p className="text-ghost/60 text-sm">Self-correcting recursive loops.</p>
          </div>
          <div className="relative h-32 mt-8">
            {shuffleItems.map((item, i) => (
              <div
                key={item}
                className="absolute w-full p-4 bg-void border border-white/10 rounded-2xl font-mono text-xs text-plasma/80 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  transform: `translateY(${i * 12}px) scale(${1 - i * 0.05})`,
                  opacity: 1 - i * 0.3,
                  zIndex: 3 - i
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Telemetry Typewriter */}
        <div className="relative overflow-hidden bg-graphite/40 border border-white/5 rounded-[2rem] p-8 aspect-square flex flex-col group hover:border-plasma/30 transition-colors duration-500">
          <div className="mb-auto flex justify-between items-start">
            <div>
              <Terminal className="w-8 h-8 text-ghost mb-4" />
              <h4 className="text-xl font-bold mb-2">Real-time Telemetry</h4>
              <p className="text-ghost/60 text-sm">Transparent reasoning traces.</p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-plasma uppercase bg-plasma/10 px-2 py-1 rounded-full border border-plasma/20">
              <span className="w-1.5 h-1.5 bg-plasma rounded-full animate-pulse"></span>
              Live
            </div>
          </div>
          <div className="h-32 mt-8 p-4 bg-void border border-white/10 rounded-2xl font-mono text-xs text-ghost/80 overflow-hidden relative">
            <pre className="whitespace-pre-wrap">{textFeed}<span className="inline-block w-2 h-4 bg-plasma ml-1 animate-pulse align-middle"></span></pre>
            <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Card 3: Cursor Protocol Scheduler */}
        <div className="relative overflow-hidden bg-graphite/40 border border-white/5 rounded-[2rem] p-8 aspect-square flex flex-col group hover:border-plasma/30 transition-colors duration-500">
          <div className="mb-auto">
            <Settings className="w-8 h-8 text-plasma mb-4" />
            <h4 className="text-xl font-bold mb-2">Governance Controls</h4>
            <p className="text-ghost/60 text-sm">Strict boundary enforcement.</p>
          </div>
          <div className="h-32 mt-8 bg-void border border-white/10 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden">
            <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
              <span className="font-mono text-[10px] text-ghost/50">MAX_ITERATIONS</span>
              <span className="font-mono text-xs text-plasma">5</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
              <span className="font-mono text-[10px] text-ghost/50">CONVERGE_THRESH</span>
              <span className="font-mono text-xs text-plasma">0.85</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
              <span className="font-mono text-[10px] text-ghost/50">PRUNE_BELOW</span>
              <span className="font-mono text-xs text-red-400">0.30</span>
            </div>
            {/* Animated scanning line */}
            <div className="absolute top-0 left-0 w-full h-px bg-plasma/80 shadow-[0_0_10px_var(--tw-colors-plasma)] animate-[scan_3s_ease-in-out_infinite]"></div>
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
          start: 'top 70%',
        },
        y: 30,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out'
      });
    }, textRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative w-full py-40 px-6 md:px-12 bg-[#05050A] border-y border-white/5 overflow-hidden">
      {/* Texture background */}
      <div className="absolute inset-0 opacity-20 mix-blend-screen bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>

      <div ref={textRef} className="relative z-10 max-w-5xl mx-auto flex flex-col gap-12">
        <p className="philo-line font-sora text-xl md:text-3xl text-ghost/40 leading-relaxed max-w-3xl">
          Most AI agents focus on <span className="text-ghost/80 line-through">statistical auto-completion</span>.
        </p>
        <p className="philo-line font-drama text-5xl md:text-8xl text-ghost leading-[0.9] tracking-tight">
          We focus on <br />
          <span className="text-plasma italic pr-6">autonomous Graph of Thoughts</span> <br />
          reasoning.
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
        if (i === cardsRef.current.length - 1) return; // Skip last
        ScrollTrigger.create({
          trigger: card,
          start: 'top 20%',
          endTrigger: container.current,
          end: 'bottom bottom',
          pin: true,
          pinSpacing: false,
          scrub: true,
          animation: gsap.to(card, {
            scale: 0.9,
            opacity: 0.4,
            filter: 'blur(8px)',
            ease: 'none'
          })
        });
      });
    }, container);
    return () => ctx.revert();
  }, []);

  const steps = [
    { num: '01', title: 'Generative Expansion', desc: 'Agent proposes multiple divergent solutions via propose_thought.', icon: <Network className="w-12 h-12 text-plasma" /> },
    { num: '02', title: 'Reflective Critique', desc: 'Self-evaluating via reflect_and_refine with a 4-axis confidence vector.', icon: <Database className="w-12 h-12 text-ghost" /> },
    { num: '03', title: 'Pruning & Convergence', desc: 'Dead ends are stripped. Surviving nodes converge on the global minimum.', icon: <Scissors className="w-12 h-12 text-red-500" /> }
  ];

  return (
    <section id="protocol" ref={container} className="relative w-full py-32 px-6 md:px-12 flex flex-col items-center">
      <div className="w-full max-w-3xl text-center mb-32">
        <h2 className="font-drama text-5xl md:text-7xl text-plasma">The Protocol</h2>
      </div>

      {steps.map((step, i) => (
        <div
          key={i}
          ref={el => cardsRef.current[i] = el}
          className="w-full max-w-4xl h-[60vh] md:h-[50vh] bg-void border border-white/10 rounded-[3rem] p-12 mb-24 last:mb-0 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-12 overflow-hidden relative"
        >
          {/* Abstract background SVG */}
          <div className="absolute right-[-10%] opacity-5 pointer-events-none scale-150 text-white">
            {step.icon}
          </div>

          <div className="flex flex-col gap-6 relative z-10 max-w-lg">
            <span className="font-mono text-plasma text-2xl border-b border-white/10 pb-4 inline-block w-16">{step.num}</span>
            <h3 className="font-sora text-3xl md:text-4xl font-bold">{step.title}</h3>
            <p className="text-ghost/60 text-lg">{step.desc}</p>
          </div>

          <div className="relative z-10 hidden md:block w-48 h-48 bg-graphite/40 border border-white/5 rounded-[2rem] flex items-center justify-center shadow-lg">
            {step.icon}
          </div>
        </div>
      ))}
    </section>
  );
}

// ==========================================
// F. PRICING
// ==========================================
function Pricing() {
  return (
    <section id="pricing" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="mb-20 text-center">
        <h2 className="font-drama text-5xl md:text-7xl text-ghost mb-6">Scale your cognition</h2>
        <p className="text-ghost/60 text-lg max-w-2xl mx-auto">Open-source foundations, enterprise-grade scalability. Deploy GoT MCP in the configuration that suits your fleet.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Tier 1 */}
        <div className="p-8 pb-10 rounded-[2.5rem] bg-void border border-white/10 flex flex-col hover:border-plasma/30 transition-colors">
          <h3 className="font-sora text-xl font-bold mb-2">Local / OSS</h3>
          <div className="font-mono text-4xl mb-6">$0<span className="text-sm text-ghost/40">/mo</span></div>
          <p className="text-sm text-ghost/60 mb-8 border-b border-white/10 pb-8">Full MCP server running locally via stdio.</p>
          <ul className="flex flex-col gap-4 mb-10 text-sm font-medium">
            <li className="flex gap-3"><Check className="w-5 h-5 text-plasma" /> All 16 Tools</li>
            <li className="flex gap-3"><Check className="w-5 h-5 text-plasma" /> Controller Loop</li>
            <li className="flex gap-3 text-ghost/40"><Check className="w-5 h-5 text-ghost/20" /> JSON Persistence</li>
          </ul>
          <button className="mt-auto w-full py-4 rounded-full border border-white/20 hover:bg-white/5 font-bold transition-colors">
            npm install
          </button>
        </div>

        {/* Tier 2 */}
        <div className="p-10 pb-12 rounded-[3rem] bg-graphite border-[1.5px] border-plasma relative transform md:scale-105 shadow-[0_0_40px_rgba(123,97,255,0.15)] z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-plasma text-void px-4 py-1 rounded-full font-bold text-xs uppercase tracking-wider">
            Production
          </div>
          <h3 className="font-sora text-xl font-bold mb-2">Cloud Sandbox</h3>
          <div className="font-mono text-5xl text-plasma mb-6">$29<span className="text-base text-ghost/40">/mo</span></div>
          <p className="text-sm text-ghost/60 mb-8 border-b border-white/10 pb-8">Hosted HTTP API with deep isolated state.</p>
          <ul className="flex flex-col gap-4 mb-10 text-sm font-medium">
            <li className="flex gap-3"><Check className="w-5 h-5 text-plasma" /> 10,000 Graph Nodes</li>
            <li className="flex gap-3"><Check className="w-5 h-5 text-plasma" /> Serverless REST Bridge</li>
            <li className="flex gap-3"><Check className="w-5 h-5 text-plasma" /> Visualizer Dashboard</li>
          </ul>
          <button className="mt-auto w-full py-4 rounded-full bg-plasma text-void font-bold hover:shadow-[0_0_20px_var(--tw-colors-plasma)] transition-all">
            Start Trial
          </button>
        </div>

        {/* Tier 3 */}
        <div className="p-8 pb-10 rounded-[2.5rem] bg-void border border-white/10 flex flex-col hover:border-plasma/30 transition-colors">
          <h3 className="font-sora text-xl font-bold mb-2">Enterprise</h3>
          <div className="font-mono text-4xl mb-6">Custom</div>
          <p className="text-sm text-ghost/60 mb-8 border-b border-white/10 pb-8">For fleets operating at unconstrained scale.</p>
          <ul className="flex flex-col gap-4 mb-10 text-sm font-medium">
            <li className="flex gap-3"><Check className="w-5 h-5 text-plasma" /> Infinite Node Cap</li>
            <li className="flex gap-3"><Check className="w-5 h-5 text-plasma" /> VPC Peering</li>
            <li className="flex gap-3 text-ghost/80"><Check className="w-5 h-5 text-plasma" /> Real-time Audit Logs</li>
          </ul>
          <button className="mt-auto w-full py-4 rounded-full border border-white/20 hover:bg-white/5 font-bold transition-colors">
            Contact Sales
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
    <footer className="mt-20 bg-graphite/40 border-t border-white/5 pt-16 pb-8 px-6 md:px-12 rounded-t-[4rem]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
        <div>
          <div className="flex items-center gap-2 text-ghost font-bold text-2xl tracking-tight mb-2">
            <BrainCircuit className="text-plasma w-8 h-8" />
            <span>GoT <span className="text-plasma">MCP</span></span>
          </div>
          <p className="text-ghost/40 text-sm">Deterministic reasoning layers for LLMs.</p>
        </div>

        <div className="flex gap-12 font-medium text-sm text-ghost/60">
          <div className="flex flex-col gap-4">
            <a href="#" className="hover:text-plasma transition-colors">NPM Package</a>
            <a href="#" className="hover:text-plasma transition-colors">GitHub Repo</a>
            <a href="#" className="hover:text-plasma transition-colors">Documentation</a>
          </div>
          <div className="flex flex-col gap-4">
            <a href="#" className="hover:text-plasma transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-plasma transition-colors">Privacy Policy</a>
            <a href="mailto:x" className="hover:text-plasma transition-colors">Contact</a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-white/5 pt-8 flex justify-between items-center text-xs text-ghost/40 font-mono">
        <div>© 2026 Abderraouf. MIT License.</div>
        <div className="flex items-center gap-2 bg-ghost/5 px-3 py-1.5 rounded-full border border-white/5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          SYSTEM OPERATIONAL
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
