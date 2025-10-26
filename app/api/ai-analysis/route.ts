import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const REKA_API_KEY = process.env.REKA_AI;

    if (!REKA_API_KEY) {
      return NextResponse.json(
        { error: 'Reka AI API key not configured' },
        { status: 500 }
      );
    }

    const prompt = `You are an advanced clinical decision support AI assistant. Analyze the following patient prescription data and provide comprehensive insights for healthcare providers.

PATIENT: ${data.patientName}
DATE: ${new Date().toLocaleDateString()}

PRESCRIPTION DATA:
- Total Prescriptions: ${data.totalCount}
- Currently Active: ${data.activeCount}
- Dispensed: ${data.dispensedCount}

MEDICATIONS:
${data.medications.map((med: any) => `
- ${med.name}
  Dosage: ${med.dosage}
  Status: ${med.status}
  Issued: ${med.issued}
  Expires: ${med.expires}
`).join('')}

Please provide:
1. **Critical Drug Interaction Analysis** - Check for dangerous medication combinations and rate severity
2. **Polypharmacy Risk Assessment** - Evaluate risks associated with multiple medications
3. **Medication Adherence Analysis** - Identify patterns suggesting non-adherence
4. **Safety Alerts** - Highlight contraindications, high-risk medications, and special monitoring needs
5. **Clinical Recommendations** - Evidence-based suggestions for optimization
6. **Therapeutic Duplication** - Identify same-class medications or overlapping therapies
7. **Laboratory Monitoring** - Required tests and monitoring schedules
8. **Patient Counseling Points** - Key education topics for the patient
9. **Abuse/Diversion Red Flags** - Signs of potential misuse or diversion
10. **Provider Action Items** - Specific steps the provider should take

Use medical terminology appropriately, include specific drug names, and provide actionable insights. Use warning symbols (⚠️, 🔴, ✅) to highlight critical information.`;

    const response = await fetch('https://api.reka.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${REKA_API_KEY}`,
        'X-Api-Key': REKA_API_KEY, // Try both header formats
      },
      body: JSON.stringify({
        model: 'reka-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reka AI API error:', response.status, errorText);

      // Return a fallback analysis instead of erroring
      return NextResponse.json({
        analysis: generateEnhancedFallback(data),
        isAI: false
      });
    }

    const result = await response.json();

    return NextResponse.json({
      analysis: result.choices[0].message.content,
      isAI: true
    });

  } catch (error) {
    console.error('AI Analysis error:', error);

    // Return fallback analysis on error
    return NextResponse.json({
      analysis: generateEnhancedFallback(request.body),
      isAI: false
    });
  }
}

function generateEnhancedFallback(data: any): string {
  const hasMultipleActive = data.activeCount > 1;
  const hasHighVolume = data.totalCount > 5;
  const riskLevel = hasMultipleActive || hasHighVolume ? 'HIGH' : 'LOW';

  return `## 🤖 Advanced Clinical Analysis

**Patient:** ${data.patientName}
**Analysis Date:** ${new Date().toLocaleDateString()}
**System:** Clinical Decision Support

### 📊 Overview
- **Total Prescriptions:** ${data.totalCount}
- **Active Medications:** ${data.activeCount}
- **Dispensed:** ${data.dispensedCount}
- **Overall Risk:** ${riskLevel === 'HIGH' ? '🔴 HIGH RISK' : '✅ LOW RISK'}

### 💊 Medication Profile
${data.medications.map((med: any) => `
**${med.name}**
- Dosage: ${med.dosage}
- Status: ${med.status}
- Prescribed: ${med.issued}
- Expires: ${med.expires}
`).join('')}

### ⚠️ Clinical Alerts

${hasMultipleActive ? `🔴 **POLYPHARMACY WARNING**
- Patient has ${data.activeCount} active medications
- Increased risk of drug interactions and adverse events
- Recommend comprehensive medication review` : '✅ No polypharmacy concerns'}

${hasHighVolume ? `
⚠️ **HIGH PRESCRIPTION VOLUME**
- ${data.totalCount} total prescriptions on record
- May indicate complex medical conditions
- Consider medication consolidation` : ''}

### 🔍 Drug Interaction Screen
*Automated screening pending full AI analysis*
- Review all active medications for interactions
- Check for contraindications
- Verify dosing appropriateness

### 📋 Provider Recommendations

1. **Immediate Actions**
   ${hasMultipleActive ? '- Conduct drug interaction screening\n   - Review medication necessity' : '- Continue current therapy'}

2. **Safety Monitoring**
   - Verify patient allergies
   - Check renal/hepatic function if applicable
   - Monitor for adverse effects

3. **Patient Education**
   - Ensure understanding of each medication's purpose
   - Review proper administration technique
   - Discuss importance of adherence

### 🏥 Follow-Up Plan
- Schedule review in ${hasMultipleActive ? '2 weeks' : '30 days'}
- Order relevant laboratory tests
- Consider pharmacist consultation for complex cases

---
*Note: Full AI analysis temporarily unavailable. Showing automated clinical screening.*`;
}