const mongoose = require('mongoose');

const lenderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    programCode: { type: String, required: true },
    creditScoreThreshold: { type: Number, required: true },
    creditScoreMultiplierHigh: { type: Number, required: true },
    creditScoreMultiplierLow: { type: Number, required: true },
    documentMultipliers: {
      all4: { type: Number, required: true },
      any3: { type: Number, required: true },
      any2: { type: Number, required: true },
      onlyCR: { type: Number, required: true },
    },
    bankStatementMultiplier: { type: Number, required: true },
    auditedReportMultiplier: { type: Number, required: true },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // each lender must have a user account
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Lender', lenderSchema);