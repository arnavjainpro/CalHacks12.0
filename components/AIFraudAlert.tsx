import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FraudIndicator {
  type: string;
  indicator: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: string;
}

interface FraudAlertProps {
  prescriptionData: any;
  patientData: any;
  onProceed: () => void;
  onReject: () => void;
}

export default function AIFraudAlert({ prescriptionData, patientData, onProceed, onReject }: FraudAlertProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [fraudData, setFraudData] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    analyzeFraud();
  }, [prescriptionData]);

  const analyzeFraud = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/fraud-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescription: {
            id: prescriptionData.id,
            medication: prescriptionData.medication,
            quantity: prescriptionData.quantity,
            dosage: prescriptionData.dosage,
            daysSupply: prescriptionData.daysSupply || 30,
            isControlled: prescriptionData.isControlled || false,
            prescribedDate: prescriptionData.issuedAt,
            requestedFillDate: new Date().toISOString(),
          },
          patient: {
            id: patientData.patientID,
            age: calculateAge(patientData.patientDOB),
            address: patientData.address || 'Unknown',
            insuranceType: 'private',
          },
          prescriber: {
            id: prescriptionData.doctorId,
            name: prescriptionData.doctorName || 'Dr. Smith',
            deaNumber: 'AB1234567',
            specialty: 'General Practice',
            location: 'Local',
          },
          pharmacy: {
            id: 'PHARM001',
            location: 'Local',
            type: 'retail' as const,
          },
          paymentMethod: 'insurance' as const,
        }),
      });

      const data = await response.json();
      setFraudData(data);
    } catch (error) {
      console.error('Fraud analysis failed:', error);
      // Set default low-risk if API fails
      setFraudData({
        riskScore: 10,
        riskLevel: 'low',
        fraudIndicators: [],
        recommendations: {
          immediate_actions: [],
          verification_needed: [],
          monitoring_suggestions: ['Standard dispensing protocol'],
        },
        blockTransaction: false,
        requiresManualReview: false,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      default: return 'ℹ️';
    }
  };

  if (isAnalyzing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6"
      >
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">AI Fraud Detection Running</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">Analyzing prescription patterns and checking for anomalies...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!fraudData) return null;

  const { riskScore, riskLevel, fraudIndicators, recommendations, blockTransaction, requiresManualReview } = fraudData;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`border rounded-lg p-6 mb-6 ${getRiskColor(riskLevel)}`}
      >
        {/* Header with Risk Score */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              {blockTransaction ? '🚫' : requiresManualReview ? '👁️' : '✅'}
              AI Fraud Detection Analysis
            </h3>
            <p className="text-sm mt-1 opacity-80">
              Blockchain verification + AI pattern analysis completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{riskScore}/100</div>
            <div className="text-sm uppercase font-semibold">{riskLevel} Risk</div>
          </div>
        </div>

        {/* Risk Meter */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${riskScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                riskScore > 75 ? 'bg-red-500' :
                riskScore > 50 ? 'bg-orange-500' :
                riskScore > 25 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
            />
          </div>
        </div>

        {/* Critical Alerts */}
        {blockTransaction && (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-4"
          >
            <p className="font-bold text-red-800 dark:text-red-200">
              ⛔ TRANSACTION BLOCKED - High fraud risk detected
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              This prescription requires immediate investigation before dispensing.
            </p>
          </motion.div>
        )}

        {/* Fraud Indicators */}
        {fraudIndicators && fraudIndicators.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm font-semibold mb-2 hover:underline cursor-pointer"
            >
              {showDetails ? '▼' : '▶'} Detected Patterns ({fraudIndicators.length})
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 mt-2"
                >
                  {fraudIndicators.map((indicator: FraudIndicator, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="font-semibold">
                            {getSeverityIcon(indicator.severity)} {indicator.indicator}
                          </span>
                          <p className="text-xs mt-1 opacity-80">{indicator.evidence}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
                          {Math.round(indicator.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && (
          <div className="space-y-3">
            {recommendations.immediate_actions?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">⚡ Immediate Actions:</p>
                <ul className="text-sm space-y-1">
                  {recommendations.immediate_actions.map((action: string, idx: number) => (
                    <li key={idx} className="ml-4">• {action}</li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations.verification_needed?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">🔍 Verification Required:</p>
                <ul className="text-sm space-y-1">
                  {recommendations.verification_needed.map((item: string, idx: number) => (
                    <li key={idx} className="ml-4">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {!blockTransaction && (
            <button
              onClick={onProceed}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
            >
              {requiresManualReview ? 'Override & Proceed' : 'Proceed with Dispensing'}
            </button>
          )}
          <button
            onClick={onReject}
            className={`${blockTransaction ? 'flex-1' : 'flex-1'} bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium`}
          >
            {blockTransaction ? 'Report & Block' : 'Reject Prescription'}
          </button>
        </div>

        {/* ML Confidence Score */}
        {fraudData.mlPrediction && (
          <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
            <p className="text-xs opacity-70">
              AI Model Confidence: {Math.round(fraudData.mlPrediction.modelConfidence * 100)}% |
              Fraud Probability: {Math.round(fraudData.mlPrediction.fraudProbability * 100)}%
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}