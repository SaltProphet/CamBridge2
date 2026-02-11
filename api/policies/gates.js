// Simple policy gates for BETA mode control

export const killSwitch = {
  isBetaMode: () => {
    // Check if BETA_MODE environment variable is set to true  
    return process.env.BETA_MODE === 'true' || process.env.BETA_MODE === '1';
  }
};

export const PolicyGates = {
  // Add other policy gates here as needed
};

export default { killSwitch, PolicyGates };
