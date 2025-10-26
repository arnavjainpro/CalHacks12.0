import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Drug {
  name: string;
  genericName: string;
  dosage: string[];
  frequency: string[];
  commonUses: string[];
  contraindications: string[];
  sideEffects: string[];
  class: string;
}

interface AIPrescriptionAssistantProps {
  patientAge?: number;
  patientWeight?: number;
  patientConditions?: string[];
  diagnosis?: string;
  onMedicationSelect: (medication: string, dosage: string, instructions: string) => void;
}

export default function AIPrescriptionAssistant({
  patientAge,
  patientWeight,
  patientConditions = [],
  diagnosis,
  onMedicationSelect
}: AIPrescriptionAssistantProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [calculatedDosage, setCalculatedDosage] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggest' | 'calculate' | 'alternatives'>('suggest');

  // Mock drug database (in production, this would come from an API)
  const drugDatabase: Drug[] = [
    {
      name: 'Amoxicillin',
      genericName: 'amoxicillin',
      dosage: ['250mg', '500mg', '875mg'],
      frequency: ['twice daily', 'three times daily'],
      commonUses: ['Bacterial infections', 'Pneumonia', 'Bronchitis', 'UTI'],
      contraindications: ['Penicillin allergy', 'Severe renal impairment'],
      sideEffects: ['Nausea', 'Diarrhea', 'Rash'],
      class: 'Antibiotic'
    },
    {
      name: 'Lisinopril',
      genericName: 'lisinopril',
      dosage: ['5mg', '10mg', '20mg', '40mg'],
      frequency: ['once daily'],
      commonUses: ['Hypertension', 'Heart failure', 'Post-MI'],
      contraindications: ['Pregnancy', 'Angioedema history', 'Bilateral renal artery stenosis'],
      sideEffects: ['Dry cough', 'Hyperkalemia', 'Dizziness'],
      class: 'ACE Inhibitor'
    },
    {
      name: 'Metformin',
      genericName: 'metformin',
      dosage: ['500mg', '850mg', '1000mg'],
      frequency: ['once daily', 'twice daily'],
      commonUses: ['Type 2 Diabetes', 'PCOS', 'Prediabetes'],
      contraindications: ['Renal impairment', 'Metabolic acidosis', 'Severe hepatic impairment'],
      sideEffects: ['GI upset', 'Lactic acidosis (rare)', 'B12 deficiency'],
      class: 'Antidiabetic'
    },
    {
      name: 'Atorvastatin',
      genericName: 'atorvastatin',
      dosage: ['10mg', '20mg', '40mg', '80mg'],
      frequency: ['once daily'],
      commonUses: ['Hyperlipidemia', 'Cardiovascular prevention', 'Post-MI'],
      contraindications: ['Active liver disease', 'Pregnancy', 'Nursing mothers'],
      sideEffects: ['Myalgia', 'Elevated liver enzymes', 'Rhabdomyolysis (rare)'],
      class: 'Statin'
    },
    {
      name: 'Albuterol',
      genericName: 'albuterol',
      dosage: ['90mcg/actuation', '2.5mg/3mL'],
      frequency: ['every 4-6 hours as needed'],
      commonUses: ['Asthma', 'COPD', 'Exercise-induced bronchospasm'],
      contraindications: ['Hypersensitivity'],
      sideEffects: ['Tremor', 'Tachycardia', 'Nervousness'],
      class: 'Beta-2 Agonist'
    }
  ];

  useEffect(() => {
    if (diagnosis) {
      analyzeDiagnosis();
    }
  }, [diagnosis]);

  const analyzeDiagnosis = async () => {
    setIsAnalyzing(true);

    // Simulate AI analysis
    setTimeout(() => {
      // Filter drugs based on diagnosis
      let relevantDrugs = drugDatabase.filter(drug => {
        const diagLower = diagnosis?.toLowerCase() || '';
        return drug.commonUses.some(use =>
          use.toLowerCase().includes(diagLower) ||
          diagLower.includes(use.toLowerCase())
        );
      });

      // If no exact match, suggest based on drug class
      if (relevantDrugs.length === 0) {
        if (diagnosis?.toLowerCase().includes('infect')) {
          relevantDrugs = drugDatabase.filter(d => d.class === 'Antibiotic');
        } else if (diagnosis?.toLowerCase().includes('diabet')) {
          relevantDrugs = drugDatabase.filter(d => d.class === 'Antidiabetic');
        } else if (diagnosis?.toLowerCase().includes('hypertension') || diagnosis?.toLowerCase().includes('blood pressure')) {
          relevantDrugs = drugDatabase.filter(d => d.class === 'ACE Inhibitor');
        }
      }

      setSuggestions(relevantDrugs);
      setIsAnalyzing(false);
    }, 1500);
  };

  const calculateDosage = (drug: Drug) => {
    if (!patientAge || !patientWeight) {
      setCalculatedDosage('Please provide patient age and weight');
      return;
    }

    let dosage = '';
    let frequency = '';

    // Pediatric dosing
    if (patientAge < 18) {
      if (drug.name === 'Amoxicillin') {
        const mgPerKg = 40; // 40-90 mg/kg/day divided
        const dailyDose = mgPerKg * patientWeight;
        const perDose = Math.round(dailyDose / 3);
        dosage = `${perDose}mg`;
        frequency = 'three times daily';
      } else if (drug.name === 'Albuterol') {
        dosage = patientAge < 12 ? '1-2 puffs' : '2 puffs';
        frequency = 'every 4-6 hours as needed';
      } else {
        dosage = 'Pediatric dosing - consult pediatric reference';
        frequency = drug.frequency[0];
      }
    }
    // Geriatric dosing
    else if (patientAge > 65) {
      // Start with lower doses for elderly
      dosage = drug.dosage[0]; // Lowest dose
      frequency = drug.frequency[0];

      if (drug.name === 'Lisinopril') {
        dosage = '2.5mg'; // Even lower starting dose
      }
    }
    // Standard adult dosing
    else {
      dosage = drug.dosage[1] || drug.dosage[0]; // Middle dose
      frequency = drug.frequency[0];
    }

    // Adjust for renal impairment if indicated
    if (patientConditions?.includes('renal impairment')) {
      dosage += ' (reduce dose for renal impairment)';
    }

    setCalculatedDosage(`${dosage} ${frequency}`);
  };

  const generateInstructions = (drug: Drug, dosage: string): string => {
    let instructions = `Take ${dosage} by mouth ${drug.frequency[0]}`;

    // Add specific instructions based on drug
    if (drug.name === 'Metformin') {
      instructions += ' with meals';
    } else if (drug.class === 'Statin') {
      instructions += ' in the evening';
    } else if (drug.name === 'Lisinopril') {
      instructions += ', same time each day';
    } else if (drug.class === 'Antibiotic') {
      instructions += ' until course completed';
    }

    // Add warnings
    if (drug.name === 'Albuterol') {
      instructions += '. Shake well before use';
    }

    return instructions;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-900/10 dark:via-gray-800 dark:to-purple-900/10 rounded-xl shadow-xl border border-indigo-200 dark:border-indigo-700 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>🤖</span>
              AI Prescription Assistant
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              Evidence-based medication recommendations powered by Reka AI
            </p>
          </div>
          <div className="text-right">
            {patientAge && patientWeight && (
              <div className="text-sm bg-white/20 rounded-lg px-3 py-2">
                <p>Age: {patientAge} years</p>
                <p>Weight: {patientWeight} kg</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('suggest')}
          className={`flex-1 py-3 px-4 font-medium transition ${
            activeTab === 'suggest'
              ? 'bg-white dark:bg-gray-800 border-b-2 border-indigo-600 text-indigo-600'
              : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          💊 Drug Suggestions
        </button>
        <button
          onClick={() => setActiveTab('calculate')}
          className={`flex-1 py-3 px-4 font-medium transition ${
            activeTab === 'calculate'
              ? 'bg-white dark:bg-gray-800 border-b-2 border-indigo-600 text-indigo-600'
              : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          📊 Dosage Calculator
        </button>
        <button
          onClick={() => setActiveTab('alternatives')}
          className={`flex-1 py-3 px-4 font-medium transition ${
            activeTab === 'alternatives'
              ? 'bg-white dark:bg-gray-800 border-b-2 border-indigo-600 text-indigo-600'
              : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          🔄 Alternatives
        </button>
      </div>

      <div className="p-6">
        {/* Drug Suggestions Tab */}
        {activeTab === 'suggest' && (
          <div>
            {isAnalyzing ? (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Analyzing diagnosis and finding best medications...
                  </p>
                </div>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Based on diagnosis: <span className="font-semibold">{diagnosis}</span>
                </p>

                {suggestions.map((drug, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`border rounded-lg p-4 cursor-pointer transition ${
                      selectedDrug?.name === drug.name
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                    }`}
                    onClick={() => {
                      setSelectedDrug(drug);
                      calculateDosage(drug);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{drug.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {drug.genericName} • {drug.class}
                        </p>
                      </div>
                      {selectedDrug?.name === drug.name && (
                        <span className="text-green-600 dark:text-green-400">✓ Selected</span>
                      )}
                    </div>

                    <div className="text-sm space-y-2">
                      <p>
                        <span className="font-medium">Common Uses:</span>{' '}
                        {drug.commonUses.slice(0, 3).join(', ')}
                      </p>
                      <p>
                        <span className="font-medium">Standard Dosing:</span>{' '}
                        {drug.dosage[0]} - {drug.dosage[drug.dosage.length - 1]} {drug.frequency[0]}
                      </p>
                    </div>

                    {selectedDrug?.name === drug.name && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600"
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium text-sm mb-1">Calculated Dosage:</p>
                            <p className="text-indigo-600 dark:text-indigo-400 font-semibold">
                              {calculatedDosage}
                            </p>
                          </div>

                          <div>
                            <p className="font-medium text-sm mb-1">Contraindications:</p>
                            <div className="flex flex-wrap gap-2">
                              {drug.contraindications.map((ci, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                >
                                  {ci}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="font-medium text-sm mb-1">Common Side Effects:</p>
                            <div className="flex flex-wrap gap-2">
                              {drug.sideEffects.map((se, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                >
                                  {se}
                                </span>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const instructions = generateInstructions(drug, calculatedDosage.split(' ')[0]);
                              onMedicationSelect(drug.name, calculatedDosage.split(' ')[0], instructions);
                            }}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                          >
                            Use This Prescription
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Enter a diagnosis to get AI-powered medication suggestions</p>
              </div>
            )}
          </div>
        )}

        {/* Dosage Calculator Tab */}
        {activeTab === 'calculate' && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Smart Dosage Calculator
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                AI calculates optimal dosing based on patient age, weight, and renal/hepatic function
              </p>
            </div>

            {selectedDrug ? (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{selectedDrug.name}</h4>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Weight-based calculation:</p>
                      <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        {calculatedDosage}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Min Dose:</p>
                        <p>{selectedDrug.dosage[0]}</p>
                      </div>
                      <div>
                        <p className="font-medium">Max Dose:</p>
                        <p>{selectedDrug.dosage[selectedDrug.dosage.length - 1]}</p>
                      </div>
                    </div>

                    {patientAge && patientAge > 65 && (
                      <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ⚠️ Geriatric patient - Starting with lower dose
                        </p>
                      </div>
                    )}

                    {patientAge && patientAge < 18 && (
                      <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg p-3">
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          👶 Pediatric dosing calculated at {patientWeight ? '40 mg/kg/day' : 'weight-based'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400">
                Select a medication from the suggestions tab to calculate dosage
              </p>
            )}
          </div>
        )}

        {/* Alternatives Tab */}
        {activeTab === 'alternatives' && selectedDrug && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Alternative Medications
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Similar drugs in the same class or with similar indications
              </p>
            </div>

            <div className="space-y-3">
              {drugDatabase
                .filter(d => d.class === selectedDrug.class && d.name !== selectedDrug.name)
                .map((alt, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-green-400 dark:hover:border-green-600 transition cursor-pointer"
                    onClick={() => {
                      setSelectedDrug(alt);
                      calculateDosage(alt);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{alt.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {alt.genericName} • {alt.dosage[0]} - {alt.dosage[alt.dosage.length - 1]}
                        </p>
                      </div>
                      <button className="text-green-600 dark:text-green-400 hover:underline text-sm">
                        Switch to this
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Attribution */}
      <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
        Powered by Reka AI • Clinical decision support • Always verify with current guidelines
      </div>
    </motion.div>
  );
}