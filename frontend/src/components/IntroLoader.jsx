// components/IntroLoader.jsx
import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Hexagon, Sparkles, Network } from 'lucide-react';
import './IntroLoader.css';

export default function IntroLoader({ onComplete }) {
  const [percent, setPercent] = useState(0);
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, active: false });

  // Progress Bar timer
  useEffect(() => {
    const start = Date.now();
    const duration = 2800; // Slightly longer for the user to enjoy the network simulation

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setPercent(progress);

      if (elapsed >= duration) {
        clearInterval(timer);
        setTimeout(onComplete, 300); // Elegant grace delay
      }
    }, 30);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Cyber Constellation Interactive Canvas Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let particles = [];
    // Dynamic particle density depending on screen sizing
    const particleCount = Math.min(65, Math.floor((window.innerWidth * window.innerHeight) / 20000));
    const maxConnectionDistance = 120;

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Generate particle nodes
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1.2,
        color: Math.random() > 0.45 ? 'rgba(65, 91, 68, 0.45)' : 'rgba(139, 111, 71, 0.45)'
      });
    }

    // Mouse movement handlers
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;

      // Update and draw particles
      particles.forEach((p) => {
        // Dynamic drift toward mouse position
        if (mouse.active && mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 220) {
            // Apply gentle magnetic pull to simulate user network interaction
            p.vx += (dx / dist) * 0.015;
            p.vy += (dy / dist) * 0.015;
          }
        }

        // Limit velocity to keep movements organic
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const maxSpeed = 1.1;
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Boundary bounce check
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      // Draw link wires (Constellation Web)
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectionDistance) {
            const alpha = (1 - dist / maxConnectionDistance) * 0.28;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            // Earthy color-interpolated connecting paths
            const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            gradient.addColorStop(0, p1.color.replace('0.45', alpha.toString()));
            gradient.addColorStop(1, p2.color.replace('0.45', alpha.toString()));
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Draw connections directly to cursor
        if (mouse.active && mouse.x !== null && mouse.y !== null) {
          const dx = p1.x - mouse.x;
          const dy = p1.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.45;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(139, 111, 71, ${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <motion.div
      className="intro-loader-wrapper"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.05,
        filter: 'blur(10px)',
        transition: { duration: 0.65, ease: [0.43, 0.13, 0.23, 0.96] } 
      }}
    >
      {/* Background Interactive Mesh Canvas */}
      <canvas ref={canvasRef} className="loader-constellation-canvas" />

      {/* Cybernetic gradient overlay */}
      <div className="loader-mesh-overlay"></div>

      <div className="loader-content">
        <div className="icon-pulse-wrapper">
          {/* Animated concentric decorative rings */}
          <motion.div 
            className="concentric-ring outer"
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div 
            className="concentric-ring middle"
            animate={{ rotate: -360 }}
            transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          />
          
          <motion.div
            className="main-loader-icon"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.9, 1.05, 1], opacity: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          >
            <Hexagon size={40} className="logo-hex" />
            <Sparkles size={15} className="logo-spark" />
          </motion.div>
        </div>

        <motion.div 
          className="text-reveal-container"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.55 }}
        >
          <h2 className="loader-title">
            SITE<span className="accent-text">GRAB</span> PRO
          </h2>
          <div className="terminal-prompt font-mono">
            <Network size={12} className="terminal-prompt-icon" />
            <span>CONNECTING SITE_NODES...</span>
          </div>
        </motion.div>

        {/* Premium loading bar progress gauge */}
        <div className="loader-gauge-container">
          <div className="loader-gauge-track">
            <motion.div 
              className="loader-gauge-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="loader-gauge-percent font-mono">{percent}%</div>
        </div>
      </div>
    </motion.div>
  );
}
