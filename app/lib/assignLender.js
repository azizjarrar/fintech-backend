// services/assignLender.js
const Lender = require('../models/lender_data_model');

module.exports = async function assignLender(app,Monthly_Average_transaction) {
  const lenders = await Lender.find();
  let best = { lender: null, limit: 0 };
  for (const L of lenders) {
    const scoreMul = app.creditScore > L.creditScoreThreshold ? L.creditScoreMultiplierHigh: L.creditScoreMultiplierLow;

    
    // check required docs
    const requiredDocs = ['cr', 'tradeLicense', 'taxCard', 'estdCertificate'];
    const availableDocs = requiredDocs.filter(doc => app.documents?.[doc]?.length > 0).length;
    const scoreDocuments = availableDocs === 4 ? L.documentMultipliers.all4 : availableDocs === 3 ? L.documentMultipliers.any3 : availableDocs === 2 ? L.documentMultipliers.any2 : L.documentMultipliers.onlyCR;
    /* calc total */
    const total = Monthly_Average_transaction * scoreMul * scoreDocuments * (L.bankStatementMultiplier ) * (L.auditedReportMultiplier)

    if (total > best.limit) best = { lender: L, limit: total };
  }
  return best;
};