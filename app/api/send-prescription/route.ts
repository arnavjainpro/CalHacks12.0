import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { PrescriptionEmail } from '@/lib/email-templates/prescription-email';
import { base64ToBlob } from '@/lib/utils/pdf';

const resend = new Resend(process.env.RESEND_API_KEY);

// Rate limiting store (in production, use Redis or a database)
const emailSendCount: Record<string, { count: number; resetTime: number }> = {};

const MAX_EMAILS_PER_PRESCRIPTION = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    // Validate Resend API key
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { prescriptionId, patientEmail, pdfData, doctorAddress, patientName, medication, issuedDate, expiresDate } = body;

    // Validate required fields
    if (!prescriptionId || !patientEmail || !pdfData || !doctorAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const now = Date.now();
    const rateLimitKey = `${prescriptionId}`;

    if (emailSendCount[rateLimitKey]) {
      const { count, resetTime } = emailSendCount[rateLimitKey];

      // Reset if window has passed
      if (now > resetTime) {
        emailSendCount[rateLimitKey] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
      } else if (count >= MAX_EMAILS_PER_PRESCRIPTION) {
        return NextResponse.json(
          { error: `Email limit reached. Maximum ${MAX_EMAILS_PER_PRESCRIPTION} emails per prescription per hour.` },
          { status: 429 }
        );
      } else {
        emailSendCount[rateLimitKey].count++;
      }
    } else {
      emailSendCount[rateLimitKey] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    }

    // Convert base64 PDF to buffer
    const pdfBuffer = Buffer.from(pdfData.split(',')[1], 'base64');

    // Render email HTML
    const emailHtml = await render(
      PrescriptionEmail({
        patientName: patientName || 'Patient',
        medication: medication || 'Prescription Medication',
        prescriptionId,
        issuedDate: issuedDate || new Date().toLocaleDateString(),
        expiresDate: expiresDate || 'See prescription',
      })
    );

    // Send email with Resend
    const fromEmail = process.env.EMAIL_FROM || 'prescriptions@medchain.app';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: patientEmail,
      subject: `Your MedChain Prescription - #${prescriptionId}`,
      html: emailHtml,
      attachments: [
        {
          filename: `prescription-${prescriptionId}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email: ' + error.message },
        { status: 500 }
      );
    }

    console.log(`Email sent successfully to ${patientEmail} for prescription ${prescriptionId}`);

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: 'Prescription email sent successfully',
    });
  } catch (error) {
    console.error('Error sending prescription email:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
