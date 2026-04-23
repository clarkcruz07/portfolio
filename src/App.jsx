import { useEffect, useRef, useState } from 'react';
import logo from './assets/logo.svg';
import clarkPhoto from './assets/clark.png';
import techLogos from './assets/tech-logos.svg';
import GroqChatbot from './components/GroqChatbot.jsx';

const techStackGroups = [
  {
    title: 'AI & Machine Learning',
    items: [
      { name: 'OpenAI', logo: 'openai' },
      { name: 'Claude', logo: 'claude' },
      { name: 'Gemini', logo: 'gemini' },
      { name: 'Groq', logo: 'groq' },
      { name: 'LangChain', logo: 'langchain' },
      { name: 'TensorFlow', logo: 'tensorflow' },
      { name: 'PyTorch', logo: 'pytorch' },
      { name: 'Keras', logo: 'keras' },
      { name: 'Pandas', logo: 'pandas' }
    ]
  },
  {
    title: 'Backend & Architecture',
    items: [
      { name: 'Node.js', logo: 'nodejs' },
      { name: 'Python', logo: 'python' },
      { name: 'PHP', logo: 'php' },
      { name: '.NET', logo: 'dotnet' },
      { name: 'Laravel', logo: 'laravel' },
      { name: 'Microservices', logo: 'microservices' },
      { name: 'RESTful APIs', logo: 'rest' },
      { name: 'Distributed Systems', logo: 'distributed' }
    ]
  },
  {
    title: 'IoT & Cloud',
    items: [
      { name: 'AWS', logo: 'aws' },
      { name: 'Azure', logo: 'azure' },
      { name: 'GCP', logo: 'gcp' },
      { name: 'Docker', logo: 'docker' },
      { name: 'Kubernetes', logo: 'kubernetes' },
      { name: 'MQTT', logo: 'mqtt' },
      { name: 'WebSocket', logo: 'websocket' },
      { name: 'Real-time Data Pipelines', logo: 'pipelines' }
    ]
  },
  {
    title: 'Security & Database',
    items: [
      { name: 'OWASP', logo: 'owasp' },
      { name: 'SIEM', logo: 'siem' },
      { name: 'IAM', logo: 'iam' },
      { name: 'PostgreSQL', logo: 'postgresql' },
      { name: 'MongoDB', logo: 'mongodb' },
      { name: 'MySQL', logo: 'mysql' },
      { name: 'Firebase', logo: 'firebase' },
      { name: 'MSSQL', logo: 'mssql' }
    ]
  }
];

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaderLeaving, setIsLoaderLeaving] = useState(false);
  const overlayRef = useRef(null);
  const progressRef = useRef(null);
  const currentSectionRef = useRef(-1);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setIsLoaderLeaving(true);
    }, 2500);

    const removeTimer = window.setTimeout(() => {
      setIsLoading(false);
    }, 3300);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('loading-active', isLoading);

    return () => {
      document.body.classList.remove('loading-active');
    };
  }, [isLoading]);

  useEffect(() => {
    const sections = document.querySelectorAll('.reveal-up');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle('visible', entry.isIntersecting);
        });
      },
      { threshold: 0.2 }
    );

    sections.forEach(section => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const slideSections = document.querySelectorAll('.slide');
    const overlay = overlayRef.current;
    const progressBar = progressRef.current;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const triggerOverlay = () => {
      if (!overlay) return;
      overlay.classList.remove('active');
      void overlay.offsetWidth;
      overlay.classList.add('active');
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        overlay.classList.remove('active');
      }, 520);
    };

    const updateProgress = () => {
      const total = document.body.scrollHeight - window.innerHeight;
      const percentage = total > 0 ? window.scrollY / total : 0;
      if (progressBar) {
        progressBar.style.width = `${Math.min(Math.max(percentage, 0), 1) * 100}%`;
      }

      let closestIndex = -1;
      let minDistance = Infinity;

      slideSections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }

        const scrollProgress = 1 - clamp(Math.abs(rect.top) / (window.innerHeight * 0.7), 0, 1);
        const parallaxShift = clamp((viewportCenter - sectionCenter) / window.innerHeight, -1, 1);
        const depthScale = 1 + (1 - scrollProgress) * 0.08;
        section.style.setProperty('--scroll-progress', scrollProgress.toFixed(3));
        section.style.setProperty('--parallax-shift', parallaxShift.toFixed(3));
        section.style.setProperty('--depth-scale', depthScale.toFixed(3));
      });

      if (closestIndex !== currentSectionRef.current) {
        currentSectionRef.current = closestIndex;
        triggerOverlay();
      }
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [isLoading]);

  return (
    <div className="app">
      {isLoading && (
        <div className={`cinematic-loader ${isLoaderLeaving ? 'loader-leave' : ''}`}>
          <div className="loader-backdrop" />
          <div className="loader-scan" />
          <div className="loader-core">
            <div className="loader-logo-shell">
              <img src={logo} alt="TwoFolds Digital" className="loader-logo" />
            </div>
            <p className="loader-kicker">TwoFolds Digital</p>
            <h2>Loading connected intelligence</h2>
            <div className="loader-line">
              <span />
            </div>
          </div>
        </div>
      )}
      <header className="brand-bar">
        <img src={logo} alt="TwoFolds Digital" className="brand-logo" />
        <div className="brand-copy">
          <span>TwoFolds Digital</span>
          <p>Designing the future of autonomous connected infrastructure</p>
        </div>
      </header>

      <div className="page-shell">
        <div className="progress-line">
          <span ref={progressRef} />
        </div>
        <main className="snap-scroll">
          <section className="slide slide-hero">
            <div className="scene-layer scene-layer-grid" />
            <div className="scene-layer scene-layer-glow" />
            <div className="slide-copy reveal-up">
              <p className="eyebrow">Connected intelligence, engineered boldly.</p>
              <h1>We design AI + IoT products that behave like they know you.</h1>
              <p className="slide-text">
                TwoFolds Digital crafts high-concept systems where sensors, AI, and interfaces move together with
                cinematic confidence.
              </p>
              <div className="hero-actions">
                <a className="hero-button hero-button-primary" href="#work">
                  Start the conversation
                </a>
                <a className="hero-button hero-button-secondary" href="#team">
                  Meet the team
                </a>
              </div>
            </div>
          </section>

          <section id="work" className="slide slide-dark slide-pinned">
            <div className="scene-layer scene-layer-grid" />
            <div className="scene-layer scene-layer-diagonal" />
            <div className="slide-copy reveal-up pin-panel">
              <p className="eyebrow">How we move</p>
              <h2>Each idea becomes a full-screen product story.</h2>
              <div className="feature-grid">
                <article className="feature-card">
                  <strong>Edge-first AI</strong>
                  <p>Build intelligence that lives at the device, learns from context, and acts in real time.</p>
                </article>
                <article className="feature-card">
                  <strong>Data as design</strong>
                  <p>Turn sensor networks into experiences that feel purposeful, not noisy.</p>
                </article>
                <article className="feature-card">
                  <strong>Systems that scale</strong>
                  <p>From product strategy to connected deployment, every layer is built to move fast.</p>
                </article>
              </div>
            </div>
          </section>

          <section className="slide slide-light">
            <div className="scene-layer scene-layer-rings" />
            <div className="slide-copy reveal-up">
              <p className="eyebrow">Why it works</p>
              <h2>Big concepts, simplified through motion and clarity.</h2>
              <p className="slide-text">
                We design digital systems that feel polished, confident, and easy to understand — even when the
                technology behind them is complex.
              </p>
            </div>
          </section>

          <section className="slide slide-stack">
            <div className="scene-layer scene-layer-grid" />
            <div className="scene-layer scene-layer-diagonal" />
            <div className="slide-copy reveal-up stack-copy">
              <p className="eyebrow">Tech stack we used</p>
              <h2>Built with the tools that let AI, cloud, and connected systems move together.</h2>
              <div className="stack-grid">
                {techStackGroups.map(group => (
                  <article className="stack-column" key={group.title}>
                    <h3>{group.title}</h3>
                    <div className="stack-list">
                      {group.items.map(item => (
                        <div className="stack-item" key={item.name}>
                          <span className="stack-icon-shell" aria-hidden="true">
                            <svg className="stack-icon" viewBox="0 0 64 64" role="img">
                              <use href={`${techLogos}#${item.logo}`} />
                            </svg>
                          </span>
                          <span>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="team" className="slide slide-team">
            <div className="scene-layer scene-layer-grid" />
            <div className="scene-layer scene-layer-glow" />
            <div className="slide-copy reveal-up">
              <p className="eyebrow">Team spotlight</p>
              <h2>One human-led team, many bold ideas.</h2>
              <p className="slide-text">
                A little playful, a little experimental, and always rooted in engineering grit.
              </p>

              <article className="team-card">
                <div className="team-card-media">
                  <div className="team-photo-shell">
                    <img src={clarkPhoto} alt="Clark" className="team-photo" />
                  </div>
                  <span className="team-role">Founder / AI Engineer</span>
                </div>
                <div className="team-card-body">
                  <h3>Clark</h3>
                  <p>Founder, AI engineer, and the one who turns smart sensors into stories that stick.</p>
                  <p className="team-note">
                    If Clark isn't sketching a device or chasing a data stream, he's probably dreaming up a better way
                    to make machines feel less mechanical.
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section className="slide slide-contact">
            <div className="scene-layer scene-layer-rings" />
            <div className="scene-layer scene-layer-diagonal" />
            <div className="slide-copy reveal-up">
              <p className="eyebrow">Ready to fold your next idea?</p>
              <h2>Bring the product you imagine into a living system.</h2>
              <p className="slide-text">
                Let’s talk through AI, IoT, and product strategy in a way that feels cinematic and clear.
              </p>
              <a className="hero-button hero-button-primary" href="mailto:hello@twofoldsdigital.com">
                Reach out
              </a>
            </div>
          </section>
        </main>
        <div className="wipe-overlay" ref={overlayRef} />
      </div>

      <footer className="footer">
        <p>TwoFolds Digital • Designing the future of autonomous connected infrastructure</p>
      </footer>
      <GroqChatbot />
    </div>
  );
}

export default App;
