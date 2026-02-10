import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassContainer, StatusIndicator, AuthModule, BetaGate } from './components';

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleEnterRoom = (roomName) => {
    window.location.href = `/room/${roomName}`;
  };

  const handleGetRoom = () => {
    window.location.href = 'mailto:contact@cambridge.app?subject=Room%20Rental%20Request';
  };

  const handleModelLogin = () => {
    window.location.href = '/dashboard.html';
  };

  const valueProps = [
    {
      icon: '🔒',
      title: 'P2P Encrypted Video',
      description: 'Direct peer-to-peer connections powered by Daily.co. No server middleman.',
    },
    {
      icon: '👻',
      title: 'Zero Logging Policy',
      description: 'Ghost Protocol: No database, no tracking, no logs. Complete privacy.',
    },
    {
      icon: '💰',
      title: 'Keep 100% of Tips',
      description: 'All tips go directly to you. We never touch your earnings.',
    },
    {
      icon: '🛡️',
      title: 'No Content Moderation',
      description: 'Your room, your rules. Adult-friendly with zero interference.',
    },
  ];

  return (
    <div className="min-h-screen bg-stealth-dark text-white scanlines">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12">
        {/* Background grid effect */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }} />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Status Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-between items-center mb-12 flex-wrap gap-4"
          >
            <StatusIndicator status="online" label="PLATFORM STATUS" />
            <div className="text-xs uppercase tracking-wider text-gray-400">
              {new Date().toISOString().split('T')[0]} | GHOST PROTOCOL ACTIVE
            </div>
          </motion.div>

          {/* Logo and Tagline */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6 neon-text uppercase tracking-widest">
              CamBridge
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-4 tracking-wide">
              Private Video Rooms for Adult Creators
            </p>
            <p className="text-sm md:text-base text-gray-500 uppercase tracking-wider">
              No Platform. No Censorship. No Cuts.
            </p>
          </motion.div>

          {/* Value Props Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          >
            {valueProps.map((prop, index) => (
              <motion.div
                key={prop.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <GlassContainer className="glass-hover h-full">
                  <div className="text-4xl mb-4">{prop.icon}</div>
                  <h3 className="text-sm font-bold mb-2 uppercase tracking-wider text-stealth-accent">
                    {prop.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {prop.description}
                  </p>
                </GlassContainer>
              </motion.div>
            ))}
          </motion.div>

          {/* Pricing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-12"
          >
            <GlassContainer className="neon-border text-center max-w-md mx-auto">
              <div className="text-5xl md:text-6xl font-bold neon-text mb-2">
                $30<span className="text-2xl text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">
                Flat rate per room. No commissions. No hidden fees.
              </p>
            </GlassContainer>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={handleGetRoom}
              className="w-full sm:w-auto bg-stealth-accent hover:bg-stealth-accent-dim text-black font-bold py-4 px-8 uppercase tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-stealth-accent/50"
            >
              Get Your Room
            </button>
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto bg-transparent border-2 border-stealth-accent neon-border text-stealth-accent hover:bg-stealth-accent hover:text-black font-bold py-4 px-8 uppercase tracking-wider transition-all duration-300"
            >
              Enter Room Code
            </button>
            <button
              onClick={handleModelLogin}
              className="w-full sm:w-auto bg-transparent border-2 border-gray-600 hover:border-stealth-accent text-gray-400 hover:text-stealth-accent font-bold py-4 px-8 uppercase tracking-wider transition-all duration-300"
            >
              Model Login
            </button>
          </motion.div>
        </div>
      </section>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <AuthModule onEnterRoom={handleEnterRoom} />
              <button
                onClick={() => setShowAuthModal(false)}
                className="mt-4 w-full text-gray-400 hover:text-white uppercase tracking-wider text-sm transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-stealth-darker py-8 px-4 text-center border-t border-gray-800">
        <p className="text-gray-500 text-sm uppercase tracking-wider">
          &copy; 2026 CamBridge. Ghost Protocol Security.{' '}
          <a href="/app" className="text-stealth-accent hover:underline">
            Legacy Bridge
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
