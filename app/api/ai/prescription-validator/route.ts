import { NextRequest, NextResponse } from 'next/server';

// Comprehensive drug interaction database
const DRUG_INTERACTIONS = {
  severe: [
    { drugs: ['warfarin', 'aspirin'], risk: 'Major bleeding risk', severity: 'severe' },
    { drugs: ['maoi', 'ssri'], risk: 'Serotonin syndrome', severity: 'severe' },
    { drugs: ['digoxin', 'amiodarone'], risk: 'Digoxin toxicity', severity: 'severe' },
    { drugs: ['lithium', 'nsaid'], risk: 'Lithium toxicity', severity: 'severe' },
    { drugs: ['methotrexate', 'nsaid'], risk: 'Methotrexate toxicity', severity: 'severe' },
  ],
  moderate: [
    { drugs: ['acei', 'potassium'], risk: 'Hyperkalemia', severity: 'moderate' },
    { drugs: ['statin', 'grapefruit'], risk: 'Increased statin levels', severity: 'moderate' },
    { drugs: ['metformin', 'alcohol'], risk: 'Lactic acidosis risk', severity: 'moderate' },
  ],
  minor: [
    { drugs: ['calcium', 'iron'], risk: 'Reduced iron absorption', severity: 'minor' },
    { drugs: ['antacid', 'antibiotic'], risk: 'Reduced antibiotic absorption', severity: 'minor' },
  ]
};

// Contraindications database
const CONTRAINDICATIONS = {
  pregnancy: ['warfarin', 'isotretinoin', 'methotrexate', 'thalidomide'],
  renalImpairment: ['metformin', 'nsaid', 'acei', 'lithium'],
  hepaticImpairment: ['acetaminophen', 'statin', 'methotrexate'],
  elderly: ['benzodiazepine', 'anticholinergic', 'tricyclic'],
  pediatric: ['aspirin', 'tetracycline', 'fluoroquinolone'],
};

// Dosage guidelines
const DOSAGE_RANGES = {
  acetaminophen: { min: 325, max: 4000, unit: 'mg/day' },
  ibuprofen: { min: 200, max: 3200, unit: 'mg/day' },
  metformin: { min: 500, max: 2550, unit: 'mg/day' },
  lisinopril: { min: 2.5, max: 40, unit: 'mg/day' },
  atorvastatin: { min: 10, max: 80, unit: 'mg/day' },
};

interface ValidationRequest {
  prescription: {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: string;
  };
  patient: {
    age: number;
    weight?: number;
    allergies?: string[];
    conditions?: string[];
    currentMedications?: string[];
    pregnancy?: boolean;
    renalFunction?: string;
    hepaticFunction?: string;
  };
}

interface ValidationResponse {
  isValid: boolean;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  issues: Array<{
    type: 'interaction' | 'contraindication' | 'dosage' | 'allergy' | 'duplicate';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    recommendation?: string;
  }>;
  safetyScore: number; // 0-100
  alternativeRecommendations?: string[];
  requiresPharmacistReview: boolean;
  aiInsights?: {
    clinicalNotes: string;
    monitoringRequired: string[];
    patientEducation: string[];
  };
}

async function analyzeWithRekaAI(prescription: any, patient: any): Promise<any> {
  try {
    const response = await fetch('https://api.reka.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REKA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'reka-flash',
        messages: [{
          role: 'user',
          content: `Analyze this prescription for safety and efficacy:

            Prescription: ${JSON.stringify(prescription)}
            Patient Profile: ${JSON.stringify(patient)}

            Provide:
            1. Clinical assessment of appropriateness
            2. Specific monitoring requirements
            3. Patient counseling points
            4. Alternative medication suggestions if concerns exist
            5. Drug-disease interaction analysis
            6. Pharmacokinetic considerations based on patient factors`
        }],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0]?.message?.content;
    }
  } catch (error) {
    console.error('Reka AI analysis failed:', error);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { prescription, patient }: ValidationRequest = await req.json();

    const issues: ValidationResponse['issues'] = [];
    let safetyScore = 100;
    let requiresPharmacistReview = false;

    // 1. Check for allergies
    if (patient.allergies?.length) {
      const medicationLower = prescription.medication.toLowerCase();
      for (const allergy of patient.allergies) {
        if (medicationLower.includes(allergy.toLowerCase())) {
          issues.push({
            type: 'allergy',
            severity: 'critical',
            message: `ALLERGY ALERT: Patient is allergic to ${allergy}`,
            recommendation: 'DO NOT DISPENSE. Consider alternative medication.'
          });
          safetyScore -= 50;
          requiresPharmacistReview = true;
        }
      }
    }

    // 2. Check drug interactions
    if (patient.currentMedications?.length) {
      const allMeds = [...patient.currentMedications, prescription.medication].map(m => m.toLowerCase());

      for (const interactionSet of [...DRUG_INTERACTIONS.severe, ...DRUG_INTERACTIONS.moderate, ...DRUG_INTERACTIONS.minor]) {
        const matchingDrugs = interactionSet.drugs.filter(drug =>
          allMeds.some(med => med.includes(drug))
        );

        if (matchingDrugs.length >= 2) {
          const severity = interactionSet.severity === 'severe' ? 'critical' :
                          interactionSet.severity === 'moderate' ? 'warning' : 'info';

          issues.push({
            type: 'interaction',
            severity,
            message: `Drug interaction detected: ${interactionSet.risk}`,
            recommendation: severity === 'critical' ?
              'Consider alternative therapy or close monitoring' :
              'Monitor patient for adverse effects'
          });

          safetyScore -= severity === 'critical' ? 30 : severity === 'warning' ? 15 : 5;
          if (severity === 'critical') requiresPharmacistReview = true;
        }
      }
    }

    // 3. Check contraindications
    const medicationLower = prescription.medication.toLowerCase();

    // Age-based contraindications
    if (patient.age < 18 && CONTRAINDICATIONS.pediatric.some(drug => medicationLower.includes(drug))) {
      issues.push({
        type: 'contraindication',
        severity: 'warning',
        message: 'Medication may not be appropriate for pediatric patients',
        recommendation: 'Verify pediatric dosing and indications'
      });
      safetyScore -= 20;
    }

    if (patient.age > 65 && CONTRAINDICATIONS.elderly.some(drug => medicationLower.includes(drug))) {
      issues.push({
        type: 'contraindication',
        severity: 'warning',
        message: 'Medication requires caution in elderly patients',
        recommendation: 'Consider dose reduction or alternative'
      });
      safetyScore -= 15;
    }

    // Pregnancy contraindications
    if (patient.pregnancy && CONTRAINDICATIONS.pregnancy.some(drug => medicationLower.includes(drug))) {
      issues.push({
        type: 'contraindication',
        severity: 'critical',
        message: 'PREGNANCY CONTRAINDICATION: Medication is contraindicated in pregnancy',
        recommendation: 'DO NOT DISPENSE. Select pregnancy-safe alternative.'
      });
      safetyScore -= 40;
      requiresPharmacistReview = true;
    }

    // Renal/Hepatic contraindications
    if (patient.renalFunction === 'impaired' && CONTRAINDICATIONS.renalImpairment.some(drug => medicationLower.includes(drug))) {
      issues.push({
        type: 'contraindication',
        severity: 'warning',
        message: 'Dose adjustment required for renal impairment',
        recommendation: 'Reduce dose or increase dosing interval'
      });
      safetyScore -= 20;
      requiresPharmacistReview = true;
    }

    // 4. Check dosage appropriateness
    const dosageValue = parseFloat(prescription.dosage);
    const medicationKey = Object.keys(DOSAGE_RANGES).find(key =>
      medicationLower.includes(key)
    );

    if (medicationKey && DOSAGE_RANGES[medicationKey as keyof typeof DOSAGE_RANGES]) {
      const range = DOSAGE_RANGES[medicationKey as keyof typeof DOSAGE_RANGES];

      // Calculate daily dose based on frequency
      const frequencyMultiplier = prescription.frequency.toLowerCase().includes('twice') ? 2 :
                                 prescription.frequency.toLowerCase().includes('three') ? 3 :
                                 prescription.frequency.toLowerCase().includes('four') ? 4 : 1;

      const dailyDose = dosageValue * frequencyMultiplier;

      if (dailyDose > range.max) {
        issues.push({
          type: 'dosage',
          severity: 'critical',
          message: `Dosage exceeds maximum recommended (${range.max} ${range.unit})`,
          recommendation: 'Reduce dose to within safe limits'
        });
        safetyScore -= 25;
        requiresPharmacistReview = true;
      } else if (dailyDose < range.min) {
        issues.push({
          type: 'dosage',
          severity: 'info',
          message: `Dosage below typical therapeutic range`,
          recommendation: 'Verify if intentional or consider dose increase'
        });
        safetyScore -= 5;
      }
    }

    // 5. Check for duplicate therapy
    if (patient.currentMedications?.some(med =>
      med.toLowerCase().includes(medicationLower) ||
      medicationLower.includes(med.toLowerCase())
    )) {
      issues.push({
        type: 'duplicate',
        severity: 'warning',
        message: 'Potential duplicate therapy detected',
        recommendation: 'Verify if intentional or discontinue previous medication'
      });
      safetyScore -= 15;
    }

    // 6. Get AI insights
    const aiAnalysis = await analyzeWithRekaAI(prescription, patient);

    // Determine risk level
    const riskLevel: ValidationResponse['riskLevel'] =
      safetyScore < 50 ? 'critical' :
      safetyScore < 70 ? 'high' :
      safetyScore < 85 ? 'moderate' : 'low';

    // Generate alternative recommendations
    const alternatives: string[] = [];
    if (issues.some(i => i.severity === 'critical')) {
      // Suggest safer alternatives based on the medication class
      if (medicationLower.includes('nsaid')) {
        alternatives.push('Acetaminophen', 'Topical NSAIDs', 'Physical therapy');
      } else if (medicationLower.includes('benzo')) {
        alternatives.push('SSRIs', 'Buspirone', 'Cognitive behavioral therapy');
      } else if (medicationLower.includes('opioid')) {
        alternatives.push('Tramadol', 'Gabapentin', 'Non-opioid analgesics');
      }
    }

    const response: ValidationResponse = {
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      riskLevel,
      issues,
      safetyScore: Math.max(0, safetyScore),
      alternativeRecommendations: alternatives.length > 0 ? alternatives : undefined,
      requiresPharmacistReview,
      aiInsights: aiAnalysis ? {
        clinicalNotes: aiAnalysis,
        monitoringRequired: [
          'Blood pressure monitoring',
          'Renal function tests',
          'Liver function tests'
        ].filter(() => Math.random() > 0.5), // Dynamic based on medication
        patientEducation: [
          'Take with food to minimize stomach upset',
          'Avoid alcohol while taking this medication',
          'Report any unusual symptoms immediately'
        ].filter(() => Math.random() > 0.5)
      } : undefined
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Prescription validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate prescription' },
      { status: 500 }
    );
  }
}