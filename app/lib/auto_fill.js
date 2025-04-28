const bcrypt = require('bcryptjs');
const User = require('../models/user_model');
const Lender = require('../models/lender_data_model');

/**
 * Seed initial users and lenders.
 * Wrap each creation in its own try/catch so one failure doesn't stop the rest.
 */
const autoFill = async () => {
  console.log('Starting auto-fill of users and lenders...');
  const users = [
    { name: 'ABC Trading', email: 'abc@msme.com', password: 'Password123', role: 'msme' },
    { name: 'Madad Admin', email: 'admin@madad.com', password: 'AdminPass123', role: 'admin' },
    {
      name: 'Lender One', email: 'lender1@portal.com', password: 'LenderPass1', role: 'lender',
      lenderProfile: { programCode: 'P1a', creditScoreThreshold: 700, creditScoreMultiplierHigh: 1.5, creditScoreMultiplierLow: 1.0,
        documentMultipliers: { all4: 1.2, any3: 1.1, any2: 1.05, onlyCR: 1 }, bankStatementMultiplier: 1.2, auditedReportMultiplier: 1.5 }
    },
    {
      name: 'Lender Two', email: 'lender2@portal.com', password: 'LenderPass2', role: 'lender',
      lenderProfile: { programCode: 'P2', creditScoreThreshold: 700, creditScoreMultiplierHigh: 1.5, creditScoreMultiplierLow: 0.9,
        documentMultipliers: { all4: 1.5, any3: 1.25, any2: 1.1, onlyCR: 1 }, bankStatementMultiplier: 1.25, auditedReportMultiplier: 1.25 }
    },
    {
      name: 'Lender Three', email: 'lender3@portal.com', password: 'LenderPass3', role: 'lender',
      lenderProfile: { programCode: 'P3', creditScoreThreshold: 600, creditScoreMultiplierHigh: 1.25, creditScoreMultiplierLow: 1.0,
        documentMultipliers: { all4: 1.25, any3: 1.2, any2: 1.1, onlyCR: 1 }, bankStatementMultiplier: 1.25, auditedReportMultiplier: 1.5 }
    },
    { name: 'Buyer One', email: 'buyer@portal.com', password: 'BuyerPass123', role: 'buyer' }
  ];

  for (const userData of users) {
    try {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        const hash = await bcrypt.hash(userData.password, 10);
        user = await User.create({
          name: userData.name,
          email: userData.email,
          password: hash,
          role: userData.role
        });
        console.log(`Created user: ${userData.email}`);
      } else {
        console.log(`User exists: ${userData.email}`);
      }

      if (userData.role === 'lender') {
        const existsProfile = await Lender.findOne({ user: user._id });
        if (!existsProfile) {
          await Lender.create({
            ...userData.lenderProfile,
            name: userData.name,
            user: user._id
          });
          console.log(`Created lender profile for: ${userData.email}`);
        } else {
          console.log(`Lender profile exists for: ${userData.email}`);
        }
      }
    } catch (err) {
      console.error(`Error processing ${userData.email}:`, err.message);
    }
  }

  console.log('Auto-fill process completed.');
};

module.exports = autoFill;
