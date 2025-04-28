// routes/application_route.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth_middleware');
const authorize = require('../middleware/authorize');
const upload = require('../lib/multer_setup'); // you said multer_setup will be imported
const { submitApplication,approveApplication,getApplications,lenderApproveApplication,getApplicationById ,uploadInvoice,approveBuyer,fundInvoice,markAsRepaid,closeApplication} = require('../controllers/application_controller');
const router = express.Router();

// Validation only for creditScore (optional)
const validateApplication = [body('creditScore').isInt({ min: 0, max: 800 }).withMessage('Credit score must be between 0 and 800'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// Submit application route
router.post(
  '/',
  authenticate,
  authorize(['msme']),

  upload.fields([
    { name: 'cr', maxCount: 1 },
    { name: 'tradeLicense', maxCount: 1 },
    { name: 'estdCertificate', maxCount: 1 },
    { name: 'taxCard', maxCount: 1 },
    { name: 'auditedReport', maxCount: 1 },
    { name: 'bankStatement', maxCount: 1 }
  ]),
  validateApplication,
  submitApplication
);


// Admin-only route to approve the application
router.post(
    '/approve/:applicationId/:status',  // Route to approve the application
    authenticate,
    authorize(['admin']),  // Only admin can approve the application
    approveApplication  
);


router.get(
    '/',
    authenticate,
    authorize(['admin', 'lender', 'buyer', 'msme']), // all roles allowed
    getApplications 
  );


// Route for lenders to approve the application (set the status to "lender_approved")
router.post(
    '/lender-approve/:applicationId', 
    authenticate,
    authorize(['lender']), // Only lender can access this route
    lenderApproveApplication 
  );

// Route to upload invoice
router.post(
    '/upload-invoice/:applicationId',
    authenticate,
    authorize(['msme']),  // Only MSME can upload the invoice
    upload.single('invoice'),  
    uploadInvoice  
  );

  
// Buyer approval route for invoice
router.post(
    '/approve-invoice-buyer/:applicationId', 
    authenticate,  
    authorize(['buyer']),  
    approveBuyer  
  );



  router.post(
    '/fund-invoice/:applicationId',
    authenticate,
    authorize(['lender']), 
    fundInvoice
  );

  router.post(
    '/markAsRepaid/:applicationId',
    authenticate,
    authorize(['msme']), 
    markAsRepaid
  );


  

  router.post(
    '/closeApplication/:applicationId',
    authenticate,
    authorize(['lender']), 
    closeApplication
  );

  
  router.get(
    '/getApplicationById/:applicationId',
    authenticate,
    authorize(['admin', 'lender', 'buyer', 'msme']), // all roles allowed
    getApplicationById 
  );


  

module.exports = router;


