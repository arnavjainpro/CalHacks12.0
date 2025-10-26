# PDF Generation & Email Functionality - Setup Guide

This guide explains how to use the new PDF generation and email functionality for prescriptions.

## Features Implemented

✅ **PDF Generation**
- Professional prescription PDFs with embedded QR codes
- Includes patient name, medication details, dosage, instructions
- QR code embedded in PDF for easy scanning
- Downloadable from both creation page and prescription details page

✅ **Email Delivery**
- Send prescription PDFs directly to patients via email
- Professional email template with prescription summary
- PDF attached to email
- Rate limiting (5 emails per prescription per hour)
- Patient consent checkbox required

✅ **Privacy & Security**
- Only patient name shown (other private info remains encrypted)
- Email consent required before sending
- TLS encryption for email transmission
- Blockchain verification information included in PDF

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# Resend API Key (required for email functionality)
RESEND_API_KEY=re_your_resend_api_key_here

# Email "From" address (must be verified in Resend)
EMAIL_FROM=prescriptions@medchain.app

# Optional: Application URL for email links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Get Resend API Key

1. Go to [resend.com](https://resend.com) and create an account
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key and add it to your `.env.local` file

### 3. Verify Email Domain (for production)

For development, Resend allows sending to your own email address without verification.

For production:
1. Add your domain in Resend dashboard
2. Add DNS records as instructed
3. Verify domain ownership
4. Update `EMAIL_FROM` to use your verified domain

## Usage

### For Doctors - Creating Prescriptions

After creating a prescription, you'll see three options:

1. **Download QR Code** - Downloads just the QR code as PNG
2. **Download PDF** - Generates and downloads a complete prescription PDF with embedded QR code
3. **Email to Patient** - Opens a modal to send the PDF via email

### For Doctors - Viewing Prescriptions

On the prescription details page ([/doctor/prescription/[id]](http://localhost:3000/doctor/prescription)), you'll find:

- **PDF Download Button** - Download the prescription as PDF
- **Email Button** - Send the prescription to patient via email

These buttons are available for all prescription statuses (Active, Dispensed, Cancelled, Expired).

## PDF Contents

The generated PDF includes:

- **Header**: MedChain branding, prescription ID, issue/expiration dates
- **Patient Information**: Patient name (other details encrypted for privacy)
- **Medication Details**: Name, dosage, quantity, refills
- **Instructions**: Full prescription instructions
- **QR Code**: Large, scannable QR code (300x300px)
- **Footer**: Blockchain verification info, doctor token ID

## Email Contents

The email includes:

- **Subject**: "Your MedChain Prescription - #[ID]"
- **Body**:
  - Prescription summary (ID, medication, dates)
  - Instructions for using the QR code
  - Security notice
- **Attachment**: Full prescription PDF

## Testing

### Test PDF Generation

1. Create a prescription as a doctor
2. Click "Download PDF" button
3. Verify PDF contains all information and QR code
4. Scan QR code with phone to verify it contains correct data

### Test Email Sending

1. Create a prescription as a doctor
2. Click "Email to Patient" button
3. Enter your email address (for testing)
4. Check the consent checkbox
5. Click "Send Email"
6. Check your inbox for the email with PDF attachment

## Rate Limiting

To prevent abuse, the following rate limits are in place:

- **5 emails per prescription** per hour
- After limit is reached, users must wait 1 hour

This is currently implemented in-memory. For production, consider using Redis or a database.

## Security Considerations

### What's Included in PDF/Email

✅ **Included**:
- Patient name (decrypted)
- Prescription details (medication, dosage, quantity, refills, instructions)
- Prescription ID and dates
- QR code with patient secret

❌ **NOT Included**:
- Patient date of birth (encrypted)
- Patient ID/SSN (encrypted)
- Full patient data hash

### Privacy Notes

1. **Email is NOT fully HIPAA compliant** - Users are warned via consent checkbox
2. **Patient secret is in QR code** - Anyone with the PDF can view the prescription
3. **Recommend secure patient portal** - Email is a convenience feature, not primary delivery method

## File Structure

```
/lib
├── utils/
│   └── pdf.ts                          # PDF generation utilities
├── email-templates/
│   └── prescription-email.tsx          # React Email template
└── hooks/
    └── usePrescription.ts              # Existing hooks (unchanged)

/app/api
└── send-prescription/
    └── route.ts                        # Email sending API endpoint

/components
├── PdfDownloadButton.tsx               # Reusable PDF download button
└── EmailPrescriptionModal.tsx          # Email sending modal

/app/doctor
├── create/page.tsx                     # Updated with PDF/Email buttons
└── prescription/[id]/page.tsx          # Updated with PDF/Email buttons
```

## Troubleshooting

### PDF Not Generating

**Issue**: PDF download button doesn't work

**Solutions**:
- Check browser console for errors
- Ensure jsPDF is installed: `pnpm list jspdf`
- Verify QR code is rendering (check browser dev tools)

### Email Not Sending

**Issue**: Email fails to send

**Solutions**:
- Verify `RESEND_API_KEY` is set in `.env.local`
- Check API key is valid in Resend dashboard
- For production: Verify domain is configured in Resend
- Check browser console and server logs for error messages

### QR Code Not in PDF

**Issue**: PDF generates but QR code is missing

**Solutions**:
- The QR code is generated asynchronously - this is expected
- Check for errors in browser console related to canvas rendering
- Try downloading again (QR should be cached)

## Cost Considerations

### Resend Pricing (as of 2025)

- **Free Tier**: 100 emails/day, 3,000 emails/month
- **Pay-as-you-go**: $0.0001 per email after free tier
- **100k emails/month**: ~$10/month

For a typical clinic with 50 prescriptions/day:
- Daily cost: $0 (within free tier)
- Monthly cost: $0 (1,500 emails < 3,000 free)

## Future Enhancements

Potential improvements for production:

1. **Blockchain Email Logging**: Store email events on-chain for audit trail
2. **SMS Delivery**: Alternative to email using Twilio
3. **Patient Portal**: Secure portal for patients to access prescriptions
4. **Multi-language Support**: Translate emails and PDFs
5. **Custom Branding**: Allow clinics to customize PDF/email design
6. **Batch Sending**: Email multiple prescriptions at once
7. **Email Tracking**: Track email opens and PDF downloads
8. **PDF Templates**: Multiple PDF layout options

## Support

For issues or questions:
- Check console logs for error messages
- Verify all environment variables are set
- Test with a simple prescription first
- Check Resend dashboard for email delivery status

## License

This feature is part of the MedChain application.
