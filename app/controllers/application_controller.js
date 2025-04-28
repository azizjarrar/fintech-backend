const Application = require('../models/application_model');
const User = require('../models/user_model');
const lender_data = require('../models/lender_data_model');
const assignLender = require('../lib/assignLender');
const { sendNotification } = require('../controllers/notification_controller')


/**
 * MSME submits a new application with documents.
 * Initially, the application will have a status of 'pending' (awaiting admin approval).
 */
exports.submitApplication = async (req, res, next) => {
  try {
    // Extract fields from the request body
    const { creditScore,monthlyAerageTransaction=0 } = req.body;
    const { cr, tradeLicense, taxCard, estdCertificate, auditedReport, bankStatement, buyerId } = req.files;
    // Create an object with the file paths of the documents
    const documents = {
      cr: cr ? cr[0].fileUrl : '',
      tradeLicense: tradeLicense ? tradeLicense[0].fileUrl : '',
      taxCard: taxCard ? taxCard[0].fileUrl : '',
      estdCertificate: estdCertificate ? estdCertificate[0].fileUrl : '',
      auditedReport: auditedReport ? auditedReport[0].fileUrl : '',
      bankStatement: bankStatement ? bankStatement[0].fileUrl : '',
    };

    const application = await Application.create({
      msme: req.user.id,  
      creditScore,
      documents,
      monthlyAerageTransaction,
      status: 'submitted',  // Status is 'submitted' initially (awaiting admin review)
    });

    let admins = await User.find({ role: "admin" }).lean()
    sendNotification(admins.map(e => e._id), 'New Application Submitted', 'An application has been submitted and is awaiting your review.', application._id);

    res.status(201).json({
      applicationId: application._id,
      status: application.status,  // 'pending'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin approves the application and assigns a lender.
 * After approval, the application status is updated to 'approved' and lender assignment is triggered.
 */
exports.approveApplication = async (req, res, next) => {
  try {
    const applicationId = req.params.applicationId;
    // Fetch the application by ID
    const application = await Application.findById(applicationId).populate('msme');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    // Check if the application is already approved or rejected
    if (application.status === 'approved' || application.status === 'rejected') {
      return res.status(400).json({ message: 'Application is already processed' });
    }

    application.status = req.params.status;

    await application.save();

    // Run lender assignment logic
    const { lender, limit } = await assignLender(application, application.monthlyAerageTransaction);

    // Update application with the assigned lender and limit
    application.assignedLender = lender._id;
    application.assignedLimit = limit;
    application.status = 'assigned_to_lender';  // Application is now assigned to a lender
    sendNotification([application.msme], 'Application Forwarded to Lender', 'Your application has been successfully forwarded to the lender for review.', application._id);
    sendNotification([lender.user], 'New Application Received', 'You have received a new application. Please review it at your earliest convenience.', application._id);

    await application.save();
    res.status(200).json({
      applicationId: application._id,
      assignedLender: {
        id: lender._id,
        name: lender.name,
      },
      assignedLimit: limit,
      status: application.status,
    });
  } catch (err) {
    next(err);
  }
};


exports.getApplications = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { skip = 0, limit = 10 } = req.query; 

    let query = {};

    if (role === 'admin') {
      query = {};
    } else if (role === 'lender') {
      const lender = await lender_data.findOne({ user: id }).exec();
      if (!lender) {
        return res.status(404).json({ error: 'Lender not found' });
      }
      query = { assignedLender: lender._id };
    } else if (role === 'buyer') {
      query = { buyer: id };
    } else if (role === 'msme') {
      query = { msme: id };
    } else {
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    // Fetch & populate with pagination
    const applications = await Application.find(query)
      .populate('msme', 'name email')
      .populate('buyer', 'name email')
      .populate('assignedLender', 'name programCode')
      .skip(Number(skip))  
      .limit(Number(limit)) 
      .sort({ createdAt: -1 });

    if (!applications.length) {
      return res.json([]); // If no applications, return an empty array
    }

    // Default templates
    const DEFAULT_DOCUMENTS = {
      cr: 'N/A',
      tradeLicense: 'N/A',
      taxCard: 'N/A',
      estdCertificate: 'N/A',
      auditedReport: 'N/A',
      bankStatement: 'N/A'
    };
    const DEFAULTS = {
      msme: { name: 'N/A', email: 'N/A' },
      buyer: { name: 'N/A', email: 'N/A' },
      assignedLender: { name: 'N/A', programCode: 'N/A' },
      documents: DEFAULT_DOCUMENTS,
      creditScore: 'N/A',
      status: 'N/A',
      assignedLimit: 'N/A',
      uploadedInvoice: 'N/A',
      fundedAmount: 'N/A',
      repaymentDate: 'N/A',
      disbursedDate: 'N/A',
      buyerApprovalDate: 'N/A',
      lenderApprovalDate: 'N/A',
      interestRate: 'N/A',
      tenure: 'N/A',
      createdAt: 'N/A',
      updatedAt: 'N/A',
      monthlyAerageTransaction:"N/A"
    };

    // Helper to replace any empty value with "N/A" and format Dates
    const normalize = obj => {
      for (const k in obj) {
        const v = obj[k];
        if (v === null || v === undefined || v === '') {
          obj[k] = 'N/A';
        } else if (v instanceof Date) {
          obj[k] = v.toISOString();
        } else if (typeof v === 'object' && !Array.isArray(v)) {
          normalize(v);
        }
      }
      return obj;
    };

    const formatted = applications.map(app => {
      const raw = app.toObject();

      const out = {        
        _id:app._id
      };
      for (const field in DEFAULTS) {
        if (field === 'documents') {
          // Merge documents
          out.documents = { ...DEFAULT_DOCUMENTS, ...(raw.documents || {}) };
        } else if (['msme', 'buyer', 'assignedLender'].includes(field)) {
          // Sub-docs
          out[field] = raw[field] ? raw[field] : DEFAULTS[field];
        } else {
          out[field] = raw[field] !== undefined && raw[field] !== null
                       ? raw[field]
                       : DEFAULTS[field];
        }
      }

      // Finally, sweep through and replace any empty string/null/undefined with "N/A",
      // and turn Dates into ISO strings
      return normalize(out);
    });
    res.json(formatted);

  } catch (err) {
    next(err);
  }
};


// Function to approve application by lender (set status to 'lender_approved')
exports.lenderApproveApplication = async (req, res,next) => {
  try {
    const { applicationId } = req.params;
    const lenderId = req.user.id;
    const { status, interestRate, tenure } = req.body; 

    // Validate the status value
    if (status !== 'approve' && status !== 'disapprove') {
      return res.status(400).json({ error: 'Invalid status. Use "approve" or "disapprove"' });
    }

    // Find the lender details
    const lender = await lender_data.findOne({ user: lenderId });
    if (!lender) {
      return res.status(404).json({ error: 'Lender not found' });
    }

    // Find the application by ID
    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if the application is assigned to the lender
    if (application.assignedLender.toString() !== lender._id.toString()) {
      return res.status(403).json({ error: 'This application is not assigned to you' });
    }

    // Ensure the application is in "assigned_to_lender" state before approval or disapproval
    if (application.status !== 'assigned_to_lender') {
      return res.status(400).json({ error: 'Application is not in the correct state to be processed by lender' });
    }

    // Update the status based on the lender's decision
    // Update the application status and other fields based on lender's decision
    if (status === 'approve') {
      application.status = 'lender_approved';
      application.lenderApprovalDate = new Date(); // Set the date of lender's approval
      application.interestRate = interestRate;  // Lender defined interest rate
      application.tenure = tenure;              // Lender defined tenure
      sendNotification([application.msme], 'Lender Approved Your Application', 'Congratulations! The lender has approved your application. You can now proceed with the next steps.', application._id);
    } else if (status === 'disapprove') {
      application.status = 'lender_disapproved';
      sendNotification([application.msme], 'Lender Disapproved Your Application', 'We regret to inform you that your application has been disapproved by the lender. Please contact us for more details or assistance.', application._id);
    }



    await application.save();
    res.status(200).json({ message: `Application ${status} by lender`, application });
  } catch (err) {
    next(err)
  }
};





exports.uploadInvoice = async (req, res,next) => {
  try {
    const { applicationId } = req.params;
    const msmeId = req.user.id;  
    const { buyerEmail } = req.body;  

    
    // Find the application by ID
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Ensure the application belongs to the current MSME
    if (application.msme.toString() !== msmeId) {
      return res.status(403).json({ error: 'This application does not belong to you' });
    }

    // Check if the application is in a state that allows invoice upload
    if (application.status !== 'lender_approved') {
      return res.status(400).json({ error: 'Application status is not lender_approved' });
    }

    // Check if the buyer exists based on the provided email
    const buyer = await User.findOne({ email: buyerEmail, role: 'buyer' });
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer with the provided email not found on the platform' });
    }

    // Set the buyer ID in the application model if buyer exists
    application.buyer = buyer._id;  // Update the application with the buyer's ID

    // Handle the file upload and save the path
    if (!req.file) {
      return res.status(400).json({ error: 'No invoice file uploaded' });
    }

    // Set the uploaded invoice path in the application
    application.uploadedInvoice = req.file.fileUrl;  // Assuming file is uploaded to a folder

    // Update the application status to indicate invoice uploaded
    application.status = 'invoice_uploaded';

    sendNotification([buyer._id], 'Invoice Uploaded', 'msme Invoice Uploaded', application._id);

    await application.save();

    res.status(200).json({ message: 'Invoice uploaded successfully', application });
  } catch (err) {
    next(err)
  }
};



exports.approveBuyer = async (req, res,next) => {
  try {
    const { applicationId } = req.params;
    const buyerId = req.user.id;
    const {status} = req.body
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Ensure the application is in the 'invoice_uploaded' state before approval
    if (application.status !== 'invoice_uploaded') {
      return res.status(400).json({ error: 'Invoice has not been uploaded yet or the application is not in an appropriate state for approval' });
    }

    // Ensure the application belongs to the current buyer
    if (application.buyer.toString() !== buyerId) {
      return res.status(403).json({ error: 'You are not authorized to approve this invoice' });
    }

    // Set the buyer approval date
    application.buyerApprovalDate = new Date();
    // Update the application status to 'buyer_approved'
    if (status === 'approved') {
      application.status = 'buyer_approved';
    }else{
      application.status = 'buyer_disapproved';
    }

    sendNotification([application.msme], 'Buyer Approved Your Application', 'The buyer has successfully approved your application.', application._id);

    // Save the application with updated status
    await application.save();

    res.status(200).json({ message: 'Invoice approved by buyer', application });
  } catch (err) {
    next(err)
  }
};


exports.fundInvoice = async (req, res,next) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id; 
    const { invoiceAmount } = req.body
    // Find the Lender by userId

    const lender = await lender_data.findOne({ user: userId });
    if (!lender) {
      return res.status(404).json({ error: 'Lender profile not found' });
    }

    const lenderId = lender._id; 

    const application = await Application.findById(applicationId);

    if(application.assignedLimit<invoiceAmount){
      return res.status(403).json({ error: 'limit to invoice is '+application.assignedLimit });
    }

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    //  Check if application is assigned to this lender
    if (application.assignedLender.toString() !== lenderId.toString()) {
      return res.status(403).json({ error: 'You are not assigned to this application' });
    }

    // Check status
    if (application.status !== 'buyer_approved') {
      return res.status(400).json({ error: 'Invoice must be buyer approved before funding' });
    }
    if (!invoiceAmount || !application.interestRate || !application.tenure) {
      return res.status(400).json({ error: 'Missing invoice amount, interest rate, or tenure' });
    }

    //  Calculate fees and fundedAmount
    const fees = invoiceAmount * (application.interestRate / 100) * (application.tenure / 12);
    const fundedAmount = invoiceAmount - fees;

    application.fundedAmount = fundedAmount;
    application.invoiceAmount = invoiceAmount;
    application.status = 'invoice_funded';
    application.disbursedDate = new Date();
    sendNotification([application.msme], 'Buyer Approved Your Application', 'You have successfully received the funds from the lender for your MSME application.', application._id);

    await application.save();

    res.status(200).json({
      message: 'Invoice funded successfully',
      fundedAmount,
      application,
    });

  } catch (err) {
    next(err)
  }
};



exports.markAsRepaid = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const msmeId = req.user.id;  

    const application = await Application.findById(applicationId).populate('msme');
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    // Ensure the application belongs to the current MSME
    if (application.msme._id.toString() !== msmeId) {
      return res.status(403).json({ error: 'This application does not belong to you' });
    }

    // Check if the application is in the correct state to mark as repaid
    if (application.status !== 'invoice_funded') {
      return res.status(400).json({ error: 'Invoice must be funded before marking as repaid' });
    }

    application.isRepaid = true; // Mark as repaid
    application.repaymentDate = new Date();  // Set the repayment date to the current date

    const lender = await lender_data.findOne({ _id: application.assignedLender }).exec();
    sendNotification([lender.user], application.msme.name + 'MSME Repaid the Loan', 'The MSME has successfully repaid the loan you provided.', application._id);

    // Save the application with the updated status
    await application.save();

    res.status(200).json({
      message: 'Repayment marked as completed',
      application
    });
  } catch (err) {
    next(err);
  }
};


exports.closeApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id; 
    // Find the Lender by userId
    const lender = await lender_data.findOne({ user: userId });
    if (!lender) {
      return res.status(404).json({ error: 'Lender profile not found' });
    }

    const lenderId = lender._id; // This is the lender's _id

    // Find the application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    //  Check if application is assigned to this lender
    if (application.assignedLender.toString() !== lenderId.toString()) {
      return res.status(403).json({ error: 'You are not assigned to this application' });
    }

    // Check if the MSME has marked the repayment as true
    if (!application.isRepaid) {
      return res.status(400).json({ error: 'Repayment has not been made yet' });
    }

    // Update the application status to 'closed' and set the repayment date
    application.status = 'closed';  // Close the application

    await application.save();

    res.status(200).json({
      message: 'Application marked as closed',
      application
    });
  } catch (err) {
    next(err); 
  }
};


exports.getApplicationById = async (req, res, next) => {
  try {
    const applicationId = req.params.applicationId;
    const application = await Application.findById(applicationId)
      .populate('msme', 'name email')
      .populate('buyer', 'name email') 
      .populate('assignedLender', 'name programCode'); 
    // If the user is a lender, ensure they are authorized to view the application
    if((req.user.role !== "admin")){
       if (req.user.role === "lender") {
        const lender = await lender_data.findOne({ user: req.user.id }).exec();
        if (application && application?.assignedLender?._id?.toString() !== lender?._id?.toString()) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      } else if ((req.user.id.toString() !== application?.msme?._id?.toString()) && (req.user.id.toString() !== application?.buyer._id?.toString()) ) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }


    // Default templates
    const DEFAULT_DOCUMENTS = {
      cr: 'N/A',
      tradeLicense: 'N/A',
      taxCard: 'N/A',
      estdCertificate: 'N/A',
      auditedReport: 'N/A',
      bankStatement: 'N/A'
    };
    const DEFAULTS = {
      msme: { name: 'N/A', email: 'N/A' },
      buyer: { name: 'N/A', email: 'N/A' },
      assignedLender: { name: 'N/A', programCode: 'N/A' },
      documents: DEFAULT_DOCUMENTS,
      creditScore: 'N/A',
      status: 'N/A',
      assignedLimit: 'N/A',
      uploadedInvoice: 'N/A',
      fundedAmount: 'N/A',
      repaymentDate: 'N/A',
      disbursedDate: 'N/A',
      buyerApprovalDate: 'N/A',
      lenderApprovalDate: 'N/A',
      interestRate: 'N/A',
      tenure: 'N/A',
      createdAt: 'N/A',
      updatedAt: 'N/A',
      invoiceAmount: 'N/A',
      monthlyAerageTransaction:'N/A'

    };

    // Helper to replace any empty value with "N/A" and format Dates
    const normalize = (obj) => {
      for (const key in obj) {
        const value = obj[key];
        if (value === null || value === undefined || value === '') {
          obj[key] = 'N/A';
        } else if (value instanceof Date) {
          obj[key] = value.toISOString();
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          normalize(value);
        }
      }
      return obj;
    };

    // If application is not found, return N/A response
    if (!application) {
      const N_A_RESPONSE = {
        msme: { name: 'N/A', email: 'N/A' },
        buyer: { name: 'N/A', email: 'N/A' },
        assignedLender: { name: 'N/A', programCode: 'N/A' },
        documents: DEFAULT_DOCUMENTS,
        creditScore: 'N/A',
        status: 'N/A',
        assignedLimit: 'N/A',
        uploadedInvoice: 'N/A',
        fundedAmount: 'N/A',
        repaymentDate: 'N/A',
        disbursedDate: 'N/A',
        buyerApprovalDate: 'N/A',
        lenderApprovalDate: 'N/A',
        interestRate: 'N/A',
        tenure: 'N/A',
        invoiceAmount: 'N/A',
        isRepaid: 'N/A',
        createdAt: 'N/A',
        updatedAt: 'N/A',
        monthlyAerageTransaction:'N/A'
      };
      return res.status(200).json(N_A_RESPONSE);
    }

    // Normalize the application data
    const raw = application.toObject();
    const out = { _id: application._id };

    // Merge default values with actual data
    for (const field in DEFAULTS) {
      if (field === 'documents') {
        out.documents = { ...DEFAULT_DOCUMENTS, ...(raw.documents || {}) };
      } else if (['msme', 'buyer', 'assignedLender'].includes(field)) {
        out[field] = raw[field] ? raw[field] : DEFAULTS[field];
      } else {
        out[field] = raw[field] !== undefined && raw[field] !== null
                     ? raw[field]
                     : DEFAULTS[field];
      }
    }

    const normalizedApplication = normalize(out);

    res.status(200).json(normalizedApplication);

  } catch (error) {
    console.log(error);
    next(error);
  }
};