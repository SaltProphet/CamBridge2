import { motion } from 'framer-motion';

export const GlassContainer = ({ children, className = '', ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass rounded-lg p-6 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const StatusIndicator = ({ status = 'online', label = 'SYSTEM' }) => {
  const statusColors = {
    online: 'bg-stealth-accent',
    offline: 'bg-red-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${statusColors[status]} status-pulse`} />
      <span className="text-xs uppercase tracking-wider text-gray-400">{label}</span>
    </div>
  );
};

export const AuthModule = ({ onEnterRoom }) => {
  const [roomName, setRoomName] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const sanitized = roomName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    
    if (!sanitized) {
      setError('Please enter a room name');
      return;
    }
    
    if (sanitized !== roomName.trim().toLowerCase()) {
      setError('Invalid characters. Use only letters, numbers, hyphens, and underscores.');
      return;
    }
    
    onEnterRoom(sanitized);
  };

  return (
    <GlassContainer className="max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-4 neon-text uppercase tracking-wider">
        Access Portal
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
            Room Identifier
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => {
              setRoomName(e.target.value);
              setError('');
            }}
            placeholder="model-name"
            className="w-full bg-transparent border-b border-gray-600 focus:border-stealth-accent outline-none py-2 text-white transition-colors"
          />
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-xs mt-2"
            >
              {error}
            </motion.p>
          )}
        </div>
        <button
          type="submit"
          className="w-full bg-stealth-accent hover:bg-stealth-accent-dim text-black font-bold py-3 px-6 uppercase tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-stealth-accent/50"
        >
          Initialize Connection
        </button>
      </form>
    </GlassContainer>
  );
};

export const BetaGate = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (isOpen) {
    return children;
  }

  return (
    <GlassContainer className="text-center max-w-lg mx-auto">
      <div className="mb-6">
        <StatusIndicator status="warning" label="BETA ACCESS" />
      </div>
      <h3 className="text-2xl font-bold mb-4 neon-text uppercase tracking-wider">
        Restricted Access
      </h3>
      <p className="text-gray-400 mb-6 leading-relaxed">
        This platform is currently in closed beta. Access is restricted to authorized models only.
      </p>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-transparent border-2 border-stealth-accent neon-border text-stealth-accent hover:bg-stealth-accent hover:text-black font-bold py-3 px-8 uppercase tracking-wider transition-all duration-300"
      >
        Override Access
      </button>
    </GlassContainer>
  );
};

// Need React import for useState
import React from 'react';
