// models/application.model.js

const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
    {
        msme: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User' // Buyer is a user with role === 'buyer'
        },
        assignedLender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lender' // Lender is a user with role === 'lender'
        },
        documents: {
            cr: { type: String, default: '' },
            tradeLicense: { type: String, default: '' },
            taxCard: { type: String, default: '' },
            estdCertificate: { type: String, default: '' },
            auditedReport: { type: String, default: '' },
            bankStatement: { type: String, default: '' },
        },

        creditScore: {
            type: Number,
            min: 0,
            max: 800
        },

        status: {
            type: String,
            enum: [
                'approved',
                'rejected',
                'submitted',
                'under_review',
                'assigned_to_lender',
                'lender_approved',
                'lender_disapproved',
                'invoice_uploaded',
                'buyer_approved',
                'invoice_funded',
                'closed'
            ],
            default: 'submitted'
        },

        assignedLimit: {
            type: Number // Credit line amount assigned by lender
        },
        uploadedInvoice: {
            type: String, // Path to uploaded invoice file (if needed)
        },

        fundedAmount: {
            type: Number // Amount funded to MSME by the lender
        },

        repaymentDate: {
            type: Date // Repayment date by MSME
        },

        disbursedDate: {
            type: Date // Date when the lender disbursed the amount to MSME
        },

        buyerApprovalDate: {
            type: Date // Date when the buyer approves the invoice
        },

        lenderApprovalDate: {
            type: Date // Date when the lender approves the loan
        },

        interestRate: {
            type: Number, // Percentage
        },
        tenure: {
            type: Number, // Tenure in months
        },
        invoiceAmount:{
            type:Number
        },
        monthlyAerageTransaction:{
            type:Number
        },
        isRepaid: {
            type: Boolean,
            default: false 
        }

    },
    { timestamps: true }
);

module.exports = mongoose.model('Application', applicationSchema);