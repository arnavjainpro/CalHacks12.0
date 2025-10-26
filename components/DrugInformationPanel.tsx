'use client';

import { useState, useEffect } from 'react';
import { fetchDrugInformation, generateDrugAnalysis, type DrugInformation, type DrugAnalysis } from '@/lib/services/drugInfo';

interface DrugInformationPanelProps {
  medication: string;
  dosage: string;
  patientContext?: string;
}

export default function DrugInformationPanel({
  medication,
  dosage,
  patientContext,
}: DrugInformationPanelProps) {
  const [drugInfo, setDrugInfo] = useState<DrugInformation | null>(null);
  const [drugAnalysis, setDrugAnalysis] = useState<DrugAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'guidance'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [info, analysis] = await Promise.all([
          fetchDrugInformation(medication, dosage),
          generateDrugAnalysis(medication, dosage, patientContext),
        ]);
        setDrugInfo(info);
        setDrugAnalysis(analysis);
      } catch (error) {
        console.error('Error fetching drug information:', error);
      } finally {
        setLoading(false);
      }
    };

    if (medication) {
      fetchData();
    }
  }, [medication, dosage, patientContext]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading drug information from Reka AI...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!drugInfo) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">Unable to load drug information.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{drugInfo.drugName}</h2>
            <p className="text-blue-100 mt-1">{dosage}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className="text-xs text-blue-100">Powered by</p>
            <p className="text-sm font-semibold">Reka AI</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Detailed Info
          </button>
          <button
            onClick={() => setActiveTab('guidance')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'guidance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            AI Guidance
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What is this medication?</h3>
              <p className="text-gray-700 leading-relaxed">{drugInfo.description}</p>
            </div>

            {/* Uses */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Primary Uses</h3>
              <ul className="space-y-2">
                {drugInfo.uses.map((use, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <span className="text-gray-700">{use}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dosage Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Dosage Information</h3>
              <p className="text-blue-800">{drugInfo.dosageInfo}</p>
            </div>

            {/* Statistics */}
            {drugInfo.statistics && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Statistics & Data</h3>
                <div className="space-y-2 text-sm">
                  {drugInfo.statistics.prescriptionVolume && (
                    <p className="text-gray-700">
                      <span className="font-medium">Prescription Volume:</span>{' '}
                      {drugInfo.statistics.prescriptionVolume}
                    </p>
                  )}
                  {drugInfo.statistics.commonDemographics && (
                    <p className="text-gray-700">
                      <span className="font-medium">Demographics:</span>{' '}
                      {drugInfo.statistics.commonDemographics}
                    </p>
                  )}
                  {drugInfo.statistics.effectivenessRate && (
                    <p className="text-gray-700">
                      <span className="font-medium">Effectiveness:</span>{' '}
                      {drugInfo.statistics.effectivenessRate}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Side Effects */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-yellow-500 mr-2">⚠️</span>
                Common Side Effects
              </h3>
              <ul className="space-y-2">
                {drugInfo.sideEffects.map((effect, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-500 mr-2 mt-1">•</span>
                    <span className="text-gray-700">{effect}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Warnings */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                <span className="mr-2">🚨</span>
                Warnings & Precautions
              </h3>
              <ul className="space-y-2">
                {drugInfo.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-500 mr-2 mt-1">•</span>
                    <span className="text-red-800">{warning}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Interactions */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-900 mb-3">Drug Interactions</h3>
              <ul className="space-y-2">
                {drugInfo.interactions.map((interaction, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-500 mr-2 mt-1">•</span>
                    <span className="text-orange-800">{interaction}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'guidance' && drugAnalysis && (
          <div className="space-y-6">
            {/* AI Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-start mb-3">
                <span className="text-2xl mr-3">🤖</span>
                <h3 className="text-lg font-semibold text-purple-900">AI-Powered Summary</h3>
              </div>
              <p className="text-purple-800 leading-relaxed">{drugAnalysis.summary}</p>
            </div>

            {/* Safety Score */}
            {drugAnalysis.safetyScore && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Safety Assessment</h3>
                <p className="text-green-800">{drugAnalysis.safetyScore}</p>
              </div>
            )}

            {/* Key Points */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Points to Remember</h3>
              <div className="space-y-3">
                {drugAnalysis.keyPoints.map((point, index) => (
                  <div key={index} className="flex items-start bg-gray-50 rounded-lg p-3">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient Guidance */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Patient Guidance</h3>
              <p className="text-blue-800 leading-relaxed">{drugAnalysis.patientGuidance}</p>
            </div>

            {/* Disclaimer */}
            <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-medium mb-1">Important Disclaimer:</p>
              <p>
                This information is provided by AI for educational purposes only. Always consult with your healthcare provider or pharmacist for personalized medical advice. Do not adjust your medication without professional guidance.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
