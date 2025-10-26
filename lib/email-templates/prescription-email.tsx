import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface PrescriptionEmailProps {
  patientName: string;
  medication: string;
  prescriptionId: string;
  issuedDate: string;
  expiresDate: string;
}

export function PrescriptionEmail({
  patientName = 'Patient',
  medication = 'Medication Name',
  prescriptionId = '123',
  issuedDate = 'January 1, 2025',
  expiresDate = 'January 31, 2025',
}: PrescriptionEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your MedChain Prescription - {medication}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>MedChain</Heading>
            <Text style={headerSubtitle}>Blockchain-Secured Prescription</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={title}>Your Electronic Prescription</Heading>

            <Text style={greeting}>Dear {patientName},</Text>

            <Text style={paragraph}>
              Your prescription has been issued and is ready for dispensing. Please find the attached
              PDF document containing your prescription details and QR code.
            </Text>

            {/* Prescription Info Box */}
            <Section style={infoBox}>
              <Text style={infoLabel}>Prescription ID:</Text>
              <Text style={infoValue}>#{prescriptionId}</Text>

              <Text style={infoLabel}>Medication:</Text>
              <Text style={infoValue}>{medication}</Text>

              <Text style={infoLabel}>Issued:</Text>
              <Text style={infoValue}>{issuedDate}</Text>

              <Text style={infoLabel}>Expires:</Text>
              <Text style={infoValue}>{expiresDate}</Text>
            </Section>

            <Heading as="h2" style={subheading}>
              Important Instructions
            </Heading>

            <Section style={instructionsBox}>
              <Text style={instructionItem}>
                <strong>1. Download the PDF</strong> - Save the attached prescription PDF to your
                device
              </Text>
              <Text style={instructionItem}>
                <strong>2. Keep the QR Code Secure</strong> - The QR code in the PDF contains your
                prescription information
              </Text>
              <Text style={instructionItem}>
                <strong>3. Present at Pharmacy</strong> - Show the QR code to the pharmacist to dispense
                your medication
              </Text>
              <Text style={instructionItem}>
                <strong>4. One-Time Use</strong> - This prescription can only be dispensed once (unless
                refills are authorized)
              </Text>
            </Section>

            <Section style={warningBox}>
              <Text style={warningText}>
                <strong>⚠️ Security Notice:</strong> Keep this prescription and QR code secure. Do not
                share it with unauthorized individuals. This prescription is cryptographically secured on
                the blockchain and can be verified by authorized healthcare providers.
              </Text>
            </Section>

            <Text style={paragraph}>
              If you have any questions about your prescription, please contact your healthcare provider.
            </Text>

            <Text style={paragraph}>
              To view your prescription details online, you can visit the MedChain patient portal and scan
              the QR code.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated message from MedChain. Please do not reply to this email.
            </Text>
            <Text style={footerText}>
              MedChain - Blockchain-secured healthcare prescription management
            </Text>
            <Text style={footerSmall}>
              This email and its attachments are confidential and intended solely for the recipient.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default PrescriptionEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#2563eb',
  padding: '20px 30px',
  borderRadius: '8px 8px 0 0',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const headerSubtitle = {
  color: '#dbeafe',
  fontSize: '14px',
  margin: '5px 0 0 0',
  padding: '0',
};

const content = {
  padding: '30px',
};

const title = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

const greeting = {
  color: '#1f2937',
  fontSize: '16px',
  margin: '0 0 15px 0',
};

const paragraph = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 15px 0',
};

const infoBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const infoLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: 'bold',
  margin: '10px 0 5px 0',
  textTransform: 'uppercase' as const,
};

const infoValue = {
  color: '#1f2937',
  fontSize: '16px',
  margin: '0 0 10px 0',
};

const subheading = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '30px 0 15px 0',
};

const instructionsBox = {
  backgroundColor: '#eff6ff',
  borderLeft: '4px solid #2563eb',
  padding: '15px',
  margin: '15px 0',
};

const instructionItem = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
};

const warningBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '15px',
  margin: '20px 0',
};

const warningText = {
  color: '#92400e',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
};

const footer = {
  borderTop: '1px solid #e5e7eb',
  padding: '20px 30px',
  marginTop: '20px',
};

const footerText = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '5px 0',
  textAlign: 'center' as const,
};

const footerSmall = {
  color: '#9ca3af',
  fontSize: '11px',
  lineHeight: '18px',
  margin: '10px 0 0 0',
  textAlign: 'center' as const,
};
