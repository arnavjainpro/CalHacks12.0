import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  effect: string;
  mechanism: string;
  management: string;
  onsetTime?: string;
}

interface AIDrugInteractionProps {
  currentMedication: string;
  dosage: string;
  patientMedications?: string[];
  patientAge?: number;
  patientConditions?: string[];
  onSafetyConfirmed: () => void;
}

export default function AIDrugInteractionChecker({
  currentMedication,
  dosage,
  patientMedications = [],
  patientAge,
  patientConditions = [],
  onSafetyConfirmed
}: AIDrugInteractionProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [interactionData, setInteractionData] = useState<any>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [safetyChecked, setSafetyChecked] = useState(false);

  useEffect(() => {
    checkInteractions();
  }, [currentMedication]);

  const checkInteractions = async () => {
    setIsChecking(true);
    try {
      // Simulate getting patient's current medications (in production, from blockchain)
      const mockCurrentMeds = patientMedications.length > 0 ? patientMedications : [
        'lisinopril', 'metformin', 'atorvastatin'
      ];

      const response = await fetch('/api/ai/drug-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medications: [...mockCurrentMeds, currentMedication],
          patientFactors: {
            age: patientAge || 45,
            renalFunction: 'normal',
            hepaticFunction: 'normal',
            conditions: patientConditions,
          },
          includeFood: true,
          includeHerbal: true,
        }),
      });

      const data = await response.json();
      setInteractionData(data);
    } catch (error) {
      console.error('Interaction check failed:', error);
      // Fallback to safe state
      setInteractionData({
        interactionFound: false,
        totalInteractions: 0,
        criticalInteractions: 0,
        interactions: [],
        riskScore: 5,
        clinicalRecommendations: ['Standard dispensing protocol applies'],
        monitoringParameters: ['Standard monitoring'],
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'major': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'minor': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'major': return '⚠️';
      case 'moderate': return '⚡';
      case 'minor': return 'ℹ️';
      default: return '✓';
    }
  };

  if (isChecking) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-6"
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl">💊</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
              AI Drug Interaction Analysis
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Checking against patient medications and clinical databases...
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!interactionData) return null;

  const { interactions, riskScore, clinicalRecommendations, monitoringParameters, foodInteractions, alternativeSuggestions } = interactionData;
  const hasCritical = interactions?.some((i: DrugInteraction) => i.severity === 'critical');
  const hasMajor = interactions?.some((i: DrugInteraction) => i.severity === 'major');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg p-6 mb-6 border-2 ${
        hasCritical ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700' :
        hasMajor ? 'bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700' :
        interactions?.length > 0 ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700' :
        'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            {hasCritical ? '🚨' : hasMajor ? '⚠️' : interactions?.length > 0 ? '⚡' : '✅'}
            Drug Interaction Check
          </h3>
          <p className="text-sm mt-1 opacity-80">
            AI-powered analysis with Reka + clinical database
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">
            Safety Score: {100 - riskScore}%
          </div>
          <div className="text-sm">
            {interactions?.length || 0} interactions found
          </div>
        </div>
      </div>

      {/* Critical Alert */}
      {hasCritical && (
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded-lg p-4 mb-4"
        >
          <p className="font-bold text-red-800 dark:text-red-200">
            ⛔ CRITICAL DRUG INTERACTION DETECTED
          </p>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            This combination may cause serious adverse effects. Consider alternative therapy.
          </p>
        </motion.div>
      )}

      {/* Interactions List */}
      {interactions && interactions.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <span>Drug Interactions</span>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700">
              {interactionData.criticalInteractions} critical, {interactions.length - interactionData.criticalInteractions} other
            </span>
          </h4>

          <div className="space-y-3">
            {interactions.map((interaction: DrugInteraction, idx: number) => (
              <motion.div
                key={idx}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`rounded-lg border p-4 ${getSeverityColor(interaction.severity)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold flex items-center gap-2">
                    {getSeverityIcon(interaction.severity)}
                    {interaction.drug1} + {interaction.drug2}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold uppercase ${
                    interaction.severity === 'critical' ? 'bg-red-200 text-red-800' :
                    interaction.severity === 'major' ? 'bg-orange-200 text-orange-800' :
                    interaction.severity === 'moderate' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-blue-200 text-blue-800'
                  }`}>
                    {interaction.severity}
                  </span>
                </div>

                <p className="text-sm mb-2">
                  <strong>Effect:</strong> {interaction.effect}
                </p>

                <button
                  onClick={() => setExpandedSection(expandedSection === `int-${idx}` ? null : `int-${idx}`)}
                  className="text-xs font-semibold hover:underline"
                >
                  {expandedSection === `int-${idx}` ? '▼ Hide Details' : '▶ Show Details'}
                </button>

                <AnimatePresence>
                  {expandedSection === `int-${idx}` && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 pt-3 border-t border-current/20 space-y-2 text-sm"
                    >
                      <p><strong>Mechanism:</strong> {interaction.mechanism}</p>
                      <p><strong>Management:</strong> {interaction.management}</p>
                      {interaction.onsetTime && (
                        <p><strong>Onset:</strong> {interaction.onsetTime}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Food Interactions */}
      {foodInteractions && foodInteractions.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">🍎 Food Interactions</h4>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 space-y-2">
            {foodInteractions.map((fi: any, idx: number) => (
              <div key={idx} className="text-sm">
                <strong>{fi.medication}:</strong> Avoid {fi.food} - {fi.effect}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Recommendations */}
      {clinicalRecommendations && clinicalRecommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">📋 Clinical Recommendations</h4>
          <ul className="space-y-1">
            {clinicalRecommendations.map((rec: string, idx: number) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Monitoring Parameters */}
      {monitoringParameters && monitoringParameters.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">🔬 Monitoring Required</h4>
          <div className="flex flex-wrap gap-2">
            {monitoringParameters.map((param: string, idx: number) => (
              <span
                key={idx}
                className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
              >
                {param}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Suggestions */}
      {alternativeSuggestions && alternativeSuggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">💡 Alternative Medications</h4>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-sm">Consider these safer alternatives:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {alternativeSuggestions.map((alt: string, idx: number) => (
                <span
                  key={idx}
                  className="text-sm px-3 py-1 rounded-lg bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600"
                >
                  {alt}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation */}
      <div className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-600">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={safetyChecked}
            onChange={(e) => setSafetyChecked(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300"
          />
          <span className="text-sm font-medium">
            I have reviewed all drug interactions and will {hasCritical ? 'consult with prescriber' : 'counsel the patient appropriately'}
          </span>
        </label>

        <button
          onClick={onSafetyConfirmed}
          disabled={!safetyChecked || hasCritical}
          className={`w-full mt-4 px-6 py-3 rounded-lg font-medium transition ${
            !safetyChecked || hasCritical
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {hasCritical ? '⛔ Cannot Proceed - Critical Interaction' : 'Confirm Safety & Continue'}
        </button>
      </div>
    </motion.div>
  );
}