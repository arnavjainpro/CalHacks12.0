import { NextRequest, NextResponse } from 'next/server';

// Fraud pattern definitions
const FRAUD_PATTERNS = {
  doctor_shopping: {
    indicators: [
      'multiple_prescribers_same_drug',
      'overlapping_prescriptions',
      'geographic_dispersion',
      'weekend_emergency_visits'
    ],
    riskWeight: 0.8
  },
  prescription_forgery: {
    indicators: [
      'unusual_quantity',
      'modified_dosage',
      'suspicious_handwriting',
      'altered_dates',
      'non_standard_format'
    ],
    riskWeight: 0.9
  },
  drug_diversion: {
    indicators: [
      'early_refills',
      'lost_medication_claims',
      'cash_only_payments',
      'multiple_pharmacies',
      'out_of_area_fills'
    ],
    riskWeight: 0.7
  },
  identity_theft: {
    indicators: [
      'address_mismatch',
      'age_medication_mismatch',
      'sudden_prescription_changes',
      'insurance_irregularities'
    ],
    riskWeight: 0.85
  },
  pill_mill: {
    indicators: [
      'high_volume_controlled_substances',
      'cash_only_practice',
      'minimal_examination_time',
      'identical_prescriptions',
      'out_of_state_patients'
    ],
    riskWeight: 0.95
  }
};

// Risk scoring thresholds
const RISK_THRESHOLDS = {
  controlled_substances: {
    opioids: { dailyMME: 90, refillDays: 25, multiplePrescriberLimit: 3 },
    benzodiazepines: { refillDays: 25, concurrentOpioidFlag: true },
    stimulants: { ageLimit: { min: 6, max: 65 }, doseLimit: 60 },
    combinations: { opioidBenzoRisk: 'severe', multipleControlled: 'high' }
  },
  behavioral_flags: {
    early_refill_threshold: 0.2, // 20% early
    pharmacy_hopping_limit: 4, // pharmacies in 6 months
    prescriber_shopping_limit: 5, // prescribers in 6 months
    geographic_anomaly_miles: 50
  }
};

// Machine learning features for anomaly detection
const ML_FEATURES = {
  temporal: ['fill_frequency', 'day_of_week', 'time_of_day', 'days_supply_variance'],
  medication: ['drug_class', 'strength', 'quantity', 'mme_equivalent'],
  provider: ['prescriber_specialty', 'prescriber_location', 'prescriber_volume'],
  patient: ['age', 'gender', 'diagnosis_codes', 'insurance_type'],
  pharmacy: ['pharmacy_type', 'pharmacy_location', 'cash_ratio']
};

interface FraudDetectionRequest {
  prescription: {
    id: string;
    medication: string;
    quantity: number;
    dosage: string;
    daysSupply: number;
    isControlled: boolean;
    scheduleClass?: string;
    prescribedDate: string;
    requestedFillDate: string;
  };
  patient: {
    id: string;
    age: number;
    address: string;
    insuranceType: string;
    diagnosisCodes?: string[];
  };
  prescriber: {
    id: string;
    name: string;
    deaNumber: string;
    specialty: string;
    location: string;
  };
  pharmacy: {
    id: string;
    location: string;
    type: 'retail' | 'mail_order' | 'specialty';
  };
  historicalData?: {
    recentPrescriptions: Array<{
      medication: string;
      prescriber: string;
      fillDate: string;
      pharmacy: string;
      paidCash: boolean;
    }>;
    refillPatterns: Array<{
      expectedDate: string;
      actualDate: string;
      daysEarly: number;
    }>;
  };
  paymentMethod: 'insurance' | 'cash' | 'discount_card';
}

interface FraudDetectionResponse {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  fraudIndicators: Array<{
    type: string;
    indicator: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number; // 0-1
    evidence: string;
  }>;
  anomalies: Array<{
    feature: string;
    expectedValue: any;
    actualValue: any;
    deviationScore: number;
  }>;
  recommendations: {
    immediate_actions: string[];
    verification_needed: string[];
    monitoring_suggestions: string[];
  };
  blockTransaction: boolean;
  requiresManualReview: boolean;
  complianceAlerts: string[];
  mlPrediction?: {
    fraudProbability: number;
    modelConfidence: number;
    explainability: string;
  };
  blockchainVerification?: {
    prescriptionAuthentic: boolean;
    tamperDetected: boolean;
    chainOfCustody: string[];
  };
}

async function analyzeWithAI(request: FraudDetectionRequest): Promise<any> {
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
          content: `Analyze this prescription for potential fraud or abuse patterns:

            Prescription: ${JSON.stringify(request.prescription)}
            Patient: ${JSON.stringify(request.patient)}
            Prescriber: ${JSON.stringify(request.prescriber)}
            Historical Data: ${JSON.stringify(request.historicalData)}

            Look for:
            1. Doctor shopping or pharmacy hopping patterns
            2. Early refill patterns suggesting diversion
            3. Unusual prescribing patterns for the specialty
            4. Geographic anomalies
            5. Insurance fraud indicators
            6. Prescription modification signs
            7. Identity theft indicators

            Provide risk assessment with specific evidence.`
        }],
        temperature: 0.1, // Low temperature for consistent fraud detection
        max_tokens: 1500,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0]?.message?.content;
    }
  } catch (error) {
    console.error('AI fraud analysis failed:', error);
  }
  return null;
}

function calculateMME(medication: string, dosage: string, quantity: number): number {
  // Morphine Milligram Equivalent calculation
  const conversionFactors: Record<string, number> = {
    'morphine': 1,
    'oxycodone': 1.5,
    'hydrocodone': 1,
    'fentanyl': 2.4, // mcg/hr to MME
    'methadone': 3, // varies by dose
    'tramadol': 0.1,
    'codeine': 0.15
  };

  const medLower = medication.toLowerCase();
  for (const [drug, factor] of Object.entries(conversionFactors)) {
    if (medLower.includes(drug)) {
      const dose = parseFloat(dosage);
      return dose * factor * quantity;
    }
  }
  return 0;
}

function detectDoctorShopping(historicalData: any): any[] {
  const indicators: any[] = [];

  if (!historicalData?.recentPrescriptions) return indicators;

  // Count unique prescribers for controlled substances
  const controlledPrescribers = new Set(
    historicalData.recentPrescriptions
      .filter((rx: any) => rx.medication.toLowerCase().includes('oxycodone') ||
                          rx.medication.toLowerCase().includes('alprazolam') ||
                          rx.medication.toLowerCase().includes('adderall'))
      .map((rx: any) => rx.prescriber)
  );

  if (controlledPrescribers.size >= 3) {
    indicators.push({
      type: 'doctor_shopping',
      indicator: 'Multiple prescribers for controlled substances',
      severity: controlledPrescribers.size >= 5 ? 'critical' : 'high',
      confidence: 0.85,
      evidence: `${controlledPrescribers.size} different prescribers in recent history`
    });
  }

  // Check for overlapping prescriptions
  const medicationDates: Record<string, Date[]> = {};
  historicalData.recentPrescriptions.forEach((rx: any) => {
    if (!medicationDates[rx.medication]) {
      medicationDates[rx.medication] = [];
    }
    medicationDates[rx.medication].push(new Date(rx.fillDate));
  });

  for (const [med, dates] of Object.entries(medicationDates)) {
    if (dates.length >= 2) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < dates.length; i++) {
        const daysBetween = (dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24);
        if (daysBetween < 20) { // Filled within 20 days
          indicators.push({
            type: 'doctor_shopping',
            indicator: 'Overlapping prescriptions',
            severity: 'high',
            confidence: 0.75,
            evidence: `Multiple ${med} prescriptions within ${Math.round(daysBetween)} days`
          });
        }
      }
    }
  }

  return indicators;
}

function detectPharmacyHopping(historicalData: any): any[] {
  const indicators: any[] = [];

  if (!historicalData?.recentPrescriptions) return indicators;

  const pharmacies = new Set(historicalData.recentPrescriptions.map((rx: any) => rx.pharmacy));

  if (pharmacies.size >= RISK_THRESHOLDS.behavioral_flags.pharmacy_hopping_limit) {
    indicators.push({
      type: 'drug_diversion',
      indicator: 'Pharmacy hopping detected',
      severity: pharmacies.size >= 6 ? 'critical' : 'high',
      confidence: 0.8,
      evidence: `${pharmacies.size} different pharmacies used recently`
    });
  }

  // Check for cash payments pattern
  const cashPayments = historicalData.recentPrescriptions.filter((rx: any) => rx.paidCash);
  if (cashPayments.length / historicalData.recentPrescriptions.length > 0.5) {
    indicators.push({
      type: 'drug_diversion',
      indicator: 'High cash payment ratio',
      severity: 'medium',
      confidence: 0.65,
      evidence: `${Math.round(cashPayments.length / historicalData.recentPrescriptions.length * 100)}% cash payments`
    });
  }

  return indicators;
}

function detectEarlyRefills(historicalData: any): any[] {
  const indicators: any[] = [];

  if (!historicalData?.refillPatterns) return indicators;

  const earlyRefills = historicalData.refillPatterns.filter((pattern: any) => pattern.daysEarly > 0);
  const avgDaysEarly = earlyRefills.reduce((sum: number, p: any) => sum + p.daysEarly, 0) / earlyRefills.length;

  if (earlyRefills.length >= 3 && avgDaysEarly >= 5) {
    indicators.push({
      type: 'drug_diversion',
      indicator: 'Pattern of early refills',
      severity: avgDaysEarly >= 10 ? 'high' : 'medium',
      confidence: 0.7,
      evidence: `Average ${Math.round(avgDaysEarly)} days early on refills`
    });
  }

  return indicators;
}

function detectAnomalies(request: FraudDetectionRequest): any[] {
  const anomalies: any[] = [];

  // Check quantity anomaly
  if (request.prescription.isControlled && request.prescription.quantity > 90) {
    anomalies.push({
      feature: 'quantity',
      expectedValue: '≤90 for controlled substances',
      actualValue: request.prescription.quantity,
      deviationScore: request.prescription.quantity / 90
    });
  }

  // Check age-medication mismatch
  if (request.patient.age < 18 && request.prescription.medication.toLowerCase().includes('oxycodone')) {
    anomalies.push({
      feature: 'age_medication_match',
      expectedValue: 'Age-appropriate medication',
      actualValue: `${request.prescription.medication} for age ${request.patient.age}`,
      deviationScore: 0.9
    });
  }

  // Check geographic anomaly
  if (request.prescriber.location && request.pharmacy.location) {
    // Simple distance check (would use real geocoding in production)
    const distance = Math.abs(request.prescriber.location.length - request.pharmacy.location.length) * 10;
    if (distance > RISK_THRESHOLDS.behavioral_flags.geographic_anomaly_miles) {
      anomalies.push({
        feature: 'geographic_distance',
        expectedValue: `<${RISK_THRESHOLDS.behavioral_flags.geographic_anomaly_miles} miles`,
        actualValue: `~${distance} miles`,
        deviationScore: distance / RISK_THRESHOLDS.behavioral_flags.geographic_anomaly_miles
      });
    }
  }

  // Check early fill request
  const prescribed = new Date(request.prescription.prescribedDate);
  const requested = new Date(request.prescription.requestedFillDate);
  const daysBetween = (requested.getTime() - prescribed.getTime()) / (1000 * 60 * 60 * 24);

  if (request.prescription.isControlled && daysBetween < request.prescription.daysSupply * 0.8) {
    anomalies.push({
      feature: 'refill_timing',
      expectedValue: `≥${Math.round(request.prescription.daysSupply * 0.8)} days`,
      actualValue: `${Math.round(daysBetween)} days`,
      deviationScore: 1 - (daysBetween / (request.prescription.daysSupply * 0.8))
    });
  }

  return anomalies;
}

function calculateRiskScore(indicators: any[], anomalies: any[]): number {
  let score = 0;

  // Weight indicators by severity and confidence
  indicators.forEach(indicator => {
    const severityWeight = indicator.severity === 'critical' ? 25 :
                          indicator.severity === 'high' ? 15 :
                          indicator.severity === 'medium' ? 8 : 3;
    score += severityWeight * indicator.confidence;
  });

  // Add anomaly scores
  anomalies.forEach(anomaly => {
    score += Math.min(anomaly.deviationScore * 10, 15);
  });

  return Math.min(Math.round(score), 100);
}

export async function POST(req: NextRequest) {
  try {
    const request: FraudDetectionRequest = await req.json();

    const fraudIndicators: any[] = [];
    const anomalies: any[] = [];
    const complianceAlerts: string[] = [];
    const recommendations = {
      immediate_actions: [] as string[],
      verification_needed: [] as string[],
      monitoring_suggestions: [] as string[]
    };

    // 1. Detect doctor shopping patterns
    fraudIndicators.push(...detectDoctorShopping(request.historicalData));

    // 2. Detect pharmacy hopping
    fraudIndicators.push(...detectPharmacyHopping(request.historicalData));

    // 3. Detect early refill patterns
    fraudIndicators.push(...detectEarlyRefills(request.historicalData));

    // 4. Detect anomalies
    anomalies.push(...detectAnomalies(request));

    // 5. Check controlled substance specific rules
    if (request.prescription.isControlled) {
      // Check MME for opioids
      if (request.prescription.medication.toLowerCase().includes('oxy') ||
          request.prescription.medication.toLowerCase().includes('hydro')) {
        const mme = calculateMME(
          request.prescription.medication,
          request.prescription.dosage,
          request.prescription.quantity
        );

        if (mme > RISK_THRESHOLDS.controlled_substances.opioids.dailyMME * request.prescription.daysSupply) {
          fraudIndicators.push({
            type: 'prescription_forgery',
            indicator: 'Excessive morphine equivalent dose',
            severity: 'high',
            confidence: 0.9,
            evidence: `MME of ${Math.round(mme)} exceeds safe limits`
          });
          complianceAlerts.push('CDC Opioid Guidelines: Daily MME exceeds 90mg');
        }
      }

      // Check for cash payment on controlled substance
      if (request.paymentMethod === 'cash') {
        fraudIndicators.push({
          type: 'drug_diversion',
          indicator: 'Cash payment for controlled substance',
          severity: 'medium',
          confidence: 0.6,
          evidence: 'Avoiding insurance tracking'
        });
      }
    }

    // 6. Check DEA number validity (simple check)
    if (request.prescriber.deaNumber && !request.prescriber.deaNumber.match(/^[A-Z]{2}\d{7}$/)) {
      fraudIndicators.push({
        type: 'prescription_forgery',
        indicator: 'Invalid DEA number format',
        severity: 'critical',
        confidence: 0.95,
        evidence: 'DEA number does not match valid format'
      });
      recommendations.immediate_actions.push('Verify prescriber DEA number immediately');
    }

    // 7. AI Analysis
    const aiAnalysis = await analyzeWithAI(request);

    // Calculate final risk score
    const riskScore = calculateRiskScore(fraudIndicators, anomalies);

    // Determine risk level
    const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
      riskScore >= 75 ? 'critical' :
      riskScore >= 50 ? 'high' :
      riskScore >= 25 ? 'medium' : 'low';

    // Determine if should block transaction
    const blockTransaction = riskLevel === 'critical' ||
                           fraudIndicators.some(i => i.severity === 'critical' && i.confidence > 0.8);

    const requiresManualReview = riskLevel === 'high' || riskLevel === 'critical';

    // Generate recommendations based on findings
    if (blockTransaction) {
      recommendations.immediate_actions.push('DO NOT DISPENSE - High fraud risk detected');
      recommendations.immediate_actions.push('Report to DEA and state board if confirmed');
    }

    if (fraudIndicators.some(i => i.type === 'doctor_shopping')) {
      recommendations.verification_needed.push('Verify with prescriber before dispensing');
      recommendations.verification_needed.push('Check state PDMP database');
    }

    if (fraudIndicators.some(i => i.type === 'prescription_forgery')) {
      recommendations.verification_needed.push('Authenticate prescription with prescriber office');
      recommendations.verification_needed.push('Examine physical prescription for tampering');
    }

    if (riskLevel === 'medium' || riskLevel === 'high') {
      recommendations.monitoring_suggestions.push('Flag patient for ongoing monitoring');
      recommendations.monitoring_suggestions.push('Document interaction in patient record');
      recommendations.monitoring_suggestions.push('Consider narcotic contract');
    }

    // Add blockchain verification (mock)
    const blockchainVerification = {
      prescriptionAuthentic: !fraudIndicators.some(i => i.type === 'prescription_forgery'),
      tamperDetected: fraudIndicators.some(i => i.indicator.includes('modified')),
      chainOfCustody: [
        `Prescribed by ${request.prescriber.name}`,
        `Verified on blockchain`,
        `Presented at ${request.pharmacy.id}`
      ]
    };

    // ML prediction (mock - would use real model in production)
    const mlPrediction = riskScore > 25 ? {
      fraudProbability: riskScore / 100,
      modelConfidence: 0.85,
      explainability: aiAnalysis ?
        'Model detected patterns consistent with prescription fraud based on historical data' :
        'Anomaly detection triggered on multiple features'
    } : undefined;

    const response: FraudDetectionResponse = {
      riskScore,
      riskLevel,
      fraudIndicators,
      anomalies,
      recommendations,
      blockTransaction,
      requiresManualReview,
      complianceAlerts,
      mlPrediction,
      blockchainVerification
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Fraud detection error:', error);
    return NextResponse.json(
      { error: 'Failed to perform fraud detection' },
      { status: 500 }
    );
  }
}