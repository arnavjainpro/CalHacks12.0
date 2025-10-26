// Reka AI API integration for advanced medical analysis

interface MedicationAnalysisRequest {
  patientName: string;
  medications: Array<{
    name: string;
    dosage: string;
    status: string;
    issued: string;
    expires: string;
  }>;
  activeCount: number;
  totalCount: number;
  dispensedCount: number;
}

export async function analyzeWithRekaAI(data: MedicationAnalysisRequest): Promise<string> {
  const REKA_API_KEY = process.env.NEXT_PUBLIC_REKA_AI || process.env.REKA_AI;

  if (!REKA_API_KEY) {
    console.error('Reka AI API key not found');
    return generateFallbackAnalysis(data);
  }

  const prompt = `You are an advanced clinical decision support AI assistant. Analyze the following patient prescription data and provide comprehensive insights for healthcare providers.

PATIENT: ${data.patientName}
DATE: ${new Date().toLocaleDateString()}

PRESCRIPTION DATA:
- Total Prescriptions: ${data.totalCount}
- Currently Active: ${data.activeCount}
- Dispensed: ${data.dispensedCount}

MEDICATIONS:
${data.medications.map(med => `
- ${med.name}
  Dosage: ${med.dosage}
  Status: ${med.status}
  Issued: ${med.issued}
  Expires: ${med.expires}
`).join('')}

Please provide:
1. Critical drug interaction analysis - check for dangerous combinations
2. Polypharmacy risk assessment
3. Medication adherence patterns
4. Safety alerts and contraindications
5. Evidence-based clinical recommendations
6. Therapeutic duplication check
7. Specific monitoring requirements for high-risk medications
8. Personalized patient counseling points
9. Red flags for prescription abuse or diversion
10. Action items for the healthcare provider

Format your response with clear sections, use warning symbols (⚠️, 🔴, ✅) appropriately, and provide specific, actionable insights based on the medications listed.`;

  try {
    const response = await fetch('https://api.reka.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${REKA_API_KEY}`,
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
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('Reka AI API error:', response.status, response.statusText);
      return generateFallbackAnalysis(data);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Reka AI:', error);
    return generateFallbackAnalysis(data);
  }
}

// Fallback analysis if API fails
function generateFallbackAnalysis(data: MedicationAnalysisRequest): string {
  const hasMultipleActive = data.activeCount > 1;
  const hasHighVolume = data.totalCount > 5;

  return `## AI-Powered Prescription Analysis

**Patient:** ${data.patientName}
**Analysis Date:** ${new Date().toLocaleDateString()}

### Summary
- Total Prescriptions: ${data.totalCount}
- Active: ${data.activeCount}
- Dispensed: ${data.dispensedCount}
- Risk Level: ${hasMultipleActive || hasHighVolume ? '⚠️ Elevated' : '✅ Normal'}

### Key Findings
${hasMultipleActive ? '⚠️ Multiple active prescriptions detected - review for interactions\n' : ''}
${hasHighVolume ? '⚠️ High prescription volume - consider medication review\n' : ''}

### Medications
${data.medications.map(med => `- ${med.name} (${med.dosage}) - ${med.status}`).join('\n')}

### Recommendations
1. Review medication list with patient
2. Check for drug interactions
3. Assess adherence patterns
4. Schedule follow-up as needed

*Note: Reka AI service temporarily unavailable. Showing basic analysis.*`;
}

// Check for common drug interactions
export function checkDrugInteractions(medications: string[]): string[] {
  const interactions: Record<string, string[]> = {
    'Warfarin': ['Aspirin', 'NSAIDs', 'Amiodarone', 'Metronidazole', 'Antibiotics'],
    'Metformin': ['Contrast dye', 'Alcohol', 'Cimetidine', 'Diuretics'],
    'Lisinopril': ['Potassium supplements', 'NSAIDs', 'Lithium', 'Aliskiren'],
    'Atorvastatin': ['Grapefruit', 'Cyclosporine', 'Gemfibrozil', 'Erythromycin'],
    'Amlodipine': ['Simvastatin', 'Cyclosporine', 'Grapefruit'],
    'Omeprazole': ['Clopidogrel', 'Methotrexate', 'St Johns Wort'],
    'Levothyroxine': ['Iron supplements', 'Calcium', 'Antacids', 'Coffee'],
    'Albuterol': ['Beta blockers', 'Diuretics', 'MAO inhibitors'],
    'Gabapentin': ['Opioids', 'Benzodiazepines', 'Alcohol', 'Antacids'],
    'Insulin': ['Beta blockers', 'Thiazides', 'Corticosteroids'],
    'Digoxin': ['Amiodarone', 'Verapamil', 'Quinidine', 'Antibiotics'],
  };

  const foundInteractions: string[] = [];

  for (let i = 0; i < medications.length; i++) {
    const med1 = medications[i];

    // Check if this medication has known interactions
    for (const [drug, interactsWith] of Object.entries(interactions)) {
      if (med1.toLowerCase().includes(drug.toLowerCase())) {
        // Check against other medications
        for (let j = 0; j < medications.length; j++) {
          if (i !== j) {
            const med2 = medications[j];
            for (const interaction of interactsWith) {
              if (med2.toLowerCase().includes(interaction.toLowerCase())) {
                foundInteractions.push(`${med1} + ${med2}`);
              }
            }
          }
        }
      }
    }
  }

  return [...new Set(foundInteractions)]; // Remove duplicates
}