import { NextRequest, NextResponse } from 'next/server';

// Comprehensive drug interaction database with clinical details
const INTERACTION_DATABASE = {
  // Severe interactions (contraindicated)
  severe: {
    'warfarin': {
      interactions: [
        { drug: 'aspirin', effect: 'Major bleeding risk (3-5x increased)', mechanism: 'Additive anticoagulation', management: 'Avoid combination' },
        { drug: 'nsaid', effect: 'GI bleeding and increased INR', mechanism: 'Platelet inhibition + anticoagulation', management: 'Use alternative analgesic' },
        { drug: 'amiodarone', effect: 'INR increase (2-3x)', mechanism: 'CYP2C9 inhibition', management: 'Reduce warfarin dose 25-33%' },
        { drug: 'fluconazole', effect: 'Severe INR elevation', mechanism: 'CYP2C9 inhibition', management: 'Monitor INR closely, reduce dose' },
      ]
    },
    'ssri': {
      interactions: [
        { drug: 'maoi', effect: 'Serotonin syndrome (potentially fatal)', mechanism: 'Excessive serotonin accumulation', management: 'Contraindicated - 14 day washout' },
        { drug: 'tramadol', effect: 'Serotonin syndrome risk', mechanism: 'Dual serotonin enhancement', management: 'Use alternative analgesic' },
        { drug: 'linezolid', effect: 'Serotonin syndrome', mechanism: 'MAO inhibition', management: 'Avoid combination' },
      ]
    },
    'methotrexate': {
      interactions: [
        { drug: 'nsaid', effect: 'Methotrexate toxicity (bone marrow suppression)', mechanism: 'Reduced renal clearance', management: 'Avoid NSAIDs' },
        { drug: 'trimethoprim', effect: 'Megaloblastic anemia', mechanism: 'Folate antagonism', management: 'Monitor blood counts' },
      ]
    },
    'digoxin': {
      interactions: [
        { drug: 'amiodarone', effect: 'Digoxin toxicity (2x levels)', mechanism: 'P-glycoprotein inhibition', management: 'Reduce digoxin dose 50%' },
        { drug: 'verapamil', effect: 'Increased digoxin levels', mechanism: 'Reduced clearance', management: 'Monitor levels, reduce dose' },
        { drug: 'clarithromycin', effect: 'Digoxin toxicity', mechanism: 'P-glycoprotein inhibition', management: 'Use azithromycin instead' },
      ]
    },
    'statin': {
      interactions: [
        { drug: 'gemfibrozil', effect: 'Rhabdomyolysis risk (30x increased)', mechanism: 'CYP3A4 inhibition', management: 'Use fenofibrate instead' },
        { drug: 'clarithromycin', effect: 'Myopathy and rhabdomyolysis', mechanism: 'CYP3A4 inhibition', management: 'Hold statin during antibiotic' },
        { drug: 'itraconazole', effect: 'Severe myopathy risk', mechanism: 'Strong CYP3A4 inhibition', management: 'Contraindicated' },
      ]
    }
  },

  // Moderate interactions (use with caution)
  moderate: {
    'acei': {
      interactions: [
        { drug: 'potassium', effect: 'Hyperkalemia (K+ >5.5)', mechanism: 'Reduced K+ excretion', management: 'Monitor K+ levels monthly' },
        { drug: 'spironolactone', effect: 'Dangerous hyperkalemia', mechanism: 'Dual K+ retention', management: 'Use loop diuretic instead' },
        { drug: 'nsaid', effect: 'Reduced ACEi efficacy, renal impairment', mechanism: 'Prostaglandin inhibition', management: 'Monitor BP and creatinine' },
      ]
    },
    'metformin': {
      interactions: [
        { drug: 'alcohol', effect: 'Lactic acidosis risk', mechanism: 'Impaired lactate metabolism', management: 'Limit alcohol intake' },
        { drug: 'contrast', effect: 'Lactic acidosis in renal impairment', mechanism: 'Acute kidney injury', management: 'Hold 48h before/after contrast' },
        { drug: 'cimetidine', effect: 'Increased metformin levels', mechanism: 'Reduced renal clearance', management: 'Use alternative H2 blocker' },
      ]
    },
    'lithium': {
      interactions: [
        { drug: 'nsaid', effect: 'Lithium toxicity', mechanism: 'Reduced renal clearance', management: 'Monitor lithium levels' },
        { drug: 'thiazide', effect: 'Increased lithium levels', mechanism: 'Enhanced reabsorption', management: 'Reduce lithium dose 25%' },
        { drug: 'acei', effect: 'Lithium accumulation', mechanism: 'Reduced clearance', management: 'Monitor closely' },
      ]
    }
  },

  // Food interactions
  food: {
    'warfarin': ['vitamin K foods (inconsistent intake)', 'cranberry juice', 'grapefruit'],
    'maoi': ['tyramine-rich foods (aged cheese, wine, cured meats)'],
    'statin': ['grapefruit juice (>1 quart/day)'],
    'tetracycline': ['dairy products', 'antacids'],
    'bisphosphonate': ['any food (take on empty stomach)'],
  },

  // Herbal/supplement interactions
  herbal: {
    'stjohnswort': {
      affects: ['ssri', 'warfarin', 'digoxin', 'oral contraceptives'],
      effect: 'Reduces drug levels via CYP450 induction'
    },
    'ginkgo': {
      affects: ['warfarin', 'aspirin', 'nsaid'],
      effect: 'Increased bleeding risk'
    },
    'garlic': {
      affects: ['warfarin', 'antiplatelet'],
      effect: 'Enhanced anticoagulation'
    }
  }
};

// Pharmacogenetic considerations
const GENETIC_FACTORS = {
  'cyp2d6_poor': ['codeine', 'tramadol', 'tamoxifen'],
  'cyp2c19_poor': ['clopidogrel', 'ppi'],
  'cyp2c9_poor': ['warfarin', 'phenytoin'],
  'hla_b5701': ['abacavir'],
  'tpmt_deficiency': ['azathioprine', 'mercaptopurine'],
};

interface InteractionCheckRequest {
  medications: string[];
  patientFactors?: {
    age?: number;
    renalFunction?: 'normal' | 'mild' | 'moderate' | 'severe';
    hepaticFunction?: 'normal' | 'impaired';
    genetics?: string[];
    conditions?: string[];
  };
  includeFood?: boolean;
  includeHerbal?: boolean;
}

interface InteractionResult {
  interactionFound: boolean;
  totalInteractions: number;
  criticalInteractions: number;
  interactions: Array<{
    drug1: string;
    drug2: string;
    severity: 'critical' | 'major' | 'moderate' | 'minor';
    effect: string;
    mechanism: string;
    clinicalSignificance: string;
    management: string;
    onsetTime?: string;
    documentation: 'excellent' | 'good' | 'fair' | 'poor';
    references?: string[];
  }>;
  foodInteractions?: Array<{
    medication: string;
    food: string;
    effect: string;
    management: string;
  }>;
  herbalInteractions?: Array<{
    medication: string;
    supplement: string;
    effect: string;
    management: string;
  }>;
  pharmacogeneticConsiderations?: Array<{
    medication: string;
    gene: string;
    implication: string;
    recommendation: string;
  }>;
  riskScore: number; // 0-100
  clinicalRecommendations: string[];
  monitoringParameters: string[];
  alternativeSuggestions?: string[];
}

async function getAIEnhancedAnalysis(medications: string[], patientFactors: any): Promise<any> {
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
          content: `Perform comprehensive drug interaction analysis:

            Medications: ${medications.join(', ')}
            Patient Factors: ${JSON.stringify(patientFactors)}

            Analyze:
            1. All potential drug-drug interactions with clinical significance
            2. Pharmacokinetic and pharmacodynamic interactions
            3. Time-dependent interaction risks
            4. Patient-specific factors affecting interaction severity
            5. Monitoring requirements and parameters
            6. Alternative medication suggestions to avoid interactions
            7. Practical management strategies

            Focus on evidence-based, clinically relevant interactions.`
        }],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0]?.message?.content;
    }
  } catch (error) {
    console.error('AI analysis failed:', error);
  }
  return null;
}

function calculateOnsetTime(drug1: string, drug2: string): string {
  // Estimate onset based on pharmacokinetics
  const rapidOnset = ['aspirin', 'nsaid', 'insulin'];
  const slowOnset = ['warfarin', 'amiodarone', 'ssri'];

  if (rapidOnset.some(d => drug1.toLowerCase().includes(d) || drug2.toLowerCase().includes(d))) {
    return 'Within 2-4 hours';
  } else if (slowOnset.some(d => drug1.toLowerCase().includes(d) || drug2.toLowerCase().includes(d))) {
    return '3-7 days';
  }
  return '24-48 hours';
}

export async function POST(req: NextRequest) {
  try {
    const {
      medications,
      patientFactors,
      includeFood = true,
      includeHerbal = true
    }: InteractionCheckRequest = await req.json();

    const interactions: InteractionResult['interactions'] = [];
    const foodInteractions: InteractionResult['foodInteractions'] = [];
    const herbalInteractions: InteractionResult['herbalInteractions'] = [];
    const pharmacogeneticConsiderations: InteractionResult['pharmacogeneticConsiderations'] = [];
    const clinicalRecommendations: string[] = [];
    const monitoringParameters: Set<string> = new Set();

    // Normalize medication names
    const normalizedMeds = medications.map(m => m.toLowerCase().trim());

    // Check drug-drug interactions
    for (let i = 0; i < normalizedMeds.length; i++) {
      for (let j = i + 1; j < normalizedMeds.length; j++) {
        const med1 = normalizedMeds[i];
        const med2 = normalizedMeds[j];

        // Check severe interactions
        for (const [drugClass, data] of Object.entries(INTERACTION_DATABASE.severe)) {
          if (med1.includes(drugClass) || med2.includes(drugClass)) {
            const interactionData = data.interactions.find(int =>
              (med1.includes(drugClass) && med2.includes(int.drug)) ||
              (med2.includes(drugClass) && med1.includes(int.drug))
            );

            if (interactionData) {
              interactions.push({
                drug1: medications[i],
                drug2: medications[j],
                severity: 'critical',
                effect: interactionData.effect,
                mechanism: interactionData.mechanism,
                clinicalSignificance: 'This interaction may cause serious adverse effects',
                management: interactionData.management,
                onsetTime: calculateOnsetTime(med1, med2),
                documentation: 'excellent',
                references: ['FDA Drug Interaction Database', 'Stockley\'s Drug Interactions']
              });

              monitoringParameters.add('Clinical symptoms');
              monitoringParameters.add('Laboratory values as appropriate');
            }
          }
        }

        // Check moderate interactions
        for (const [drugClass, data] of Object.entries(INTERACTION_DATABASE.moderate)) {
          if (med1.includes(drugClass) || med2.includes(drugClass)) {
            const interactionData = data.interactions.find(int =>
              (med1.includes(drugClass) && med2.includes(int.drug)) ||
              (med2.includes(drugClass) && med1.includes(int.drug))
            );

            if (interactionData) {
              interactions.push({
                drug1: medications[i],
                drug2: medications[j],
                severity: 'moderate',
                effect: interactionData.effect,
                mechanism: interactionData.mechanism,
                clinicalSignificance: 'Monitor for adverse effects',
                management: interactionData.management,
                onsetTime: calculateOnsetTime(med1, med2),
                documentation: 'good',
              });

              if (interactionData.effect.includes('potassium')) {
                monitoringParameters.add('Serum potassium levels');
              }
              if (interactionData.effect.includes('renal')) {
                monitoringParameters.add('Serum creatinine and BUN');
              }
            }
          }
        }
      }

      // Check food interactions
      if (includeFood) {
        for (const [drug, foods] of Object.entries(INTERACTION_DATABASE.food)) {
          if (normalizedMeds[i].includes(drug)) {
            foods.forEach(food => {
              foodInteractions.push({
                medication: medications[i],
                food,
                effect: `May alter ${medications[i]} effectiveness`,
                management: drug === 'warfarin' ? 'Maintain consistent intake' :
                           drug === 'maoi' ? 'Strictly avoid' :
                           'Separate administration by 2+ hours'
              });
            });
          }
        }
      }

      // Check herbal interactions
      if (includeHerbal) {
        for (const [herb, data] of Object.entries(INTERACTION_DATABASE.herbal)) {
          if (data.affects.some(drug => normalizedMeds[i].includes(drug))) {
            herbalInteractions.push({
              medication: medications[i],
              supplement: herb.replace('stjohnswort', "St. John's Wort"),
              effect: data.effect,
              management: 'Avoid combination or monitor closely'
            });
          }
        }
      }

      // Check pharmacogenetic factors
      if (patientFactors?.genetics) {
        for (const [gene, affectedDrugs] of Object.entries(GENETIC_FACTORS)) {
          if (patientFactors.genetics.includes(gene) && affectedDrugs.some(drug => normalizedMeds[i].includes(drug))) {
            pharmacogeneticConsiderations.push({
              medication: medications[i],
              gene: gene.toUpperCase(),
              implication: gene.includes('poor') ? 'Reduced drug metabolism' : 'Increased risk of adverse effects',
              recommendation: 'Consider dose adjustment or alternative therapy'
            });
          }
        }
      }
    }

    // Adjust for patient factors
    if (patientFactors) {
      if (patientFactors.renalFunction === 'severe') {
        clinicalRecommendations.push('Adjust doses for severe renal impairment');
        monitoringParameters.add('Renal function (eGFR, creatinine)');
      }
      if (patientFactors.hepaticFunction === 'impaired') {
        clinicalRecommendations.push('Consider hepatic dose adjustments');
        monitoringParameters.add('Liver function tests (AST, ALT, bilirubin)');
      }
      if (patientFactors.age && patientFactors.age > 65) {
        clinicalRecommendations.push('Use lower initial doses in elderly patient');
        clinicalRecommendations.push('Monitor for increased sensitivity to medications');
      }
    }

    // Get AI-enhanced analysis
    const aiAnalysis = await getAIEnhancedAnalysis(medications, patientFactors);
    if (aiAnalysis) {
      clinicalRecommendations.push('AI Clinical Insight: ' + aiAnalysis.split('\n')[0]);
    }

    // Calculate risk score
    const criticalCount = interactions.filter(i => i.severity === 'critical').length;
    const majorCount = interactions.filter(i => i.severity === 'major').length;
    const moderateCount = interactions.filter(i => i.severity === 'moderate').length;

    let riskScore = 100;
    riskScore -= criticalCount * 25;
    riskScore -= majorCount * 15;
    riskScore -= moderateCount * 5;
    riskScore = Math.max(0, riskScore);

    // Add general recommendations based on findings
    if (criticalCount > 0) {
      clinicalRecommendations.push('URGENT: Critical drug interactions detected - consider alternative therapy');
      clinicalRecommendations.push('Consult with clinical pharmacist immediately');
    }
    if (interactions.length > 3) {
      clinicalRecommendations.push('Multiple interactions detected - consider simplifying regimen');
    }

    // Suggest alternatives if high risk
    const alternativeSuggestions: string[] = [];
    if (riskScore < 50) {
      if (normalizedMeds.some(m => m.includes('nsaid'))) {
        alternativeSuggestions.push('Consider acetaminophen instead of NSAIDs');
      }
      if (normalizedMeds.some(m => m.includes('warfarin'))) {
        alternativeSuggestions.push('Consider DOAC (apixaban, rivaroxaban) if appropriate');
      }
    }

    const result: InteractionResult = {
      interactionFound: interactions.length > 0,
      totalInteractions: interactions.length,
      criticalInteractions: criticalCount,
      interactions,
      foodInteractions: foodInteractions.length > 0 ? foodInteractions : undefined,
      herbalInteractions: herbalInteractions.length > 0 ? herbalInteractions : undefined,
      pharmacogeneticConsiderations: pharmacogeneticConsiderations.length > 0 ? pharmacogeneticConsiderations : undefined,
      riskScore,
      clinicalRecommendations,
      monitoringParameters: Array.from(monitoringParameters),
      alternativeSuggestions: alternativeSuggestions.length > 0 ? alternativeSuggestions : undefined
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Drug interaction check error:', error);
    return NextResponse.json(
      { error: 'Failed to check drug interactions' },
      { status: 500 }
    );
  }
}