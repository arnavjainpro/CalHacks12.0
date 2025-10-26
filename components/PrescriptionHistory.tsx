'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Prescription, PrescriptionStatus } from '@/lib/contracts/config';
import { fetchFromIPFS } from '@/lib/utils/ipfs';
import { decryptData, deriveEncryptionKey } from '@/lib/utils/crypto';

interface PrescriptionWithMetadata extends Prescription {
  metadata?: {
    medication: string;
    dosage: string;
    quantity: string;
    refills: number;
    instructions: string;
  };
}

interface PrescriptionHistoryProps {
  prescriptions: PrescriptionWithMetadata[];
  patientSecret?: `0x${string}`;
}

interface MedicationCount {
  medication: string;
  count: number;
}

interface TimelineData {
  date: string;
  count: number;
  month: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const STATUS_COLORS: Record<number, string> = {
  0: '#10B981', // Active - Green
  1: '#3B82F6', // Dispensed - Blue
  2: '#EF4444', // Cancelled - Red
  3: '#6B7280', // Expired - Gray
};

const STATUS_NAMES: Record<number, string> = {
  0: 'Active',
  1: 'Dispensed',
  2: 'Cancelled',
  3: 'Expired',
};

export default function PrescriptionHistory({
  prescriptions,
  patientSecret,
}: PrescriptionHistoryProps) {
  const [enrichedPrescriptions, setEnrichedPrescriptions] = useState<
    PrescriptionWithMetadata[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Fetch metadata for all prescriptions
  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      const enriched = await Promise.all(
        prescriptions.map(async (prescription) => {
          try {
            // If metadata already exists (dummy data), use it directly
            if (prescription.metadata) {
              return prescription;
            }

            if (!prescription.ipfsCid) return prescription;

            // Fetch from IPFS
            const data = await fetchFromIPFS(prescription.ipfsCid);

            // Decrypt if we have the patient secret
            if (patientSecret) {
              const key = deriveEncryptionKey(patientSecret);
              // The metadata should already be in the correct format
              return {
                ...prescription,
                metadata: data,
              };
            }

            return {
              ...prescription,
              metadata: data,
            };
          } catch (error) {
            console.error('Error fetching prescription metadata:', error);
            return prescription;
          }
        })
      );

      setEnrichedPrescriptions(enriched);
      setLoading(false);
    };

    fetchMetadata();
  }, [prescriptions, patientSecret]);

  // Calculate medication frequency
  const medicationFrequency: MedicationCount[] = enrichedPrescriptions
    .filter((p) => p.metadata?.medication)
    .reduce((acc, prescription) => {
      const med = prescription.metadata!.medication;
      const existing = acc.find((m) => m.medication === med);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ medication: med, count: 1 });
      }
      return acc;
    }, [] as MedicationCount[])
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 medications

  // Calculate timeline data (prescriptions per month)
  const timelineData: TimelineData[] = enrichedPrescriptions
    .map((p) => {
      const date = new Date(Number(p.issuedAt) * 1000);
      return {
        date: date.toISOString().split('T')[0],
        month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        prescription: p,
      };
    })
    .reduce((acc, item) => {
      const existing = acc.find((d) => d.month === item.month);
      if (existing) {
        existing.count++;
      } else {
        acc.push({
          date: item.date,
          month: item.month,
          count: 1,
        });
      }
      return acc;
    }, [] as TimelineData[])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate status distribution
  const statusDistribution = enrichedPrescriptions.reduce(
    (acc, prescription) => {
      const status = prescription.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  const statusData = Object.entries(statusDistribution).map(([status, count]) => ({
    name: STATUS_NAMES[Number(status)],
    value: count,
    status: Number(status),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prescription history...</p>
        </div>
      </div>
    );
  }

  if (enrichedPrescriptions.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No prescription history available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Prescriptions</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {enrichedPrescriptions.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Active</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {statusDistribution[0] || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Dispensed</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {statusDistribution[1] || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Unique Medications</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {medicationFrequency.length}
          </p>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Prescription Timeline</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Prescriptions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Medication Frequency Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Most Prescribed Medications</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={medicationFrequency}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="medication" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#10B981" name="Prescriptions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Prescription Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: any) => {
                const { name, percent } = props;
                return `${name} ${(percent * 100).toFixed(0)}%`;
              }}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Prescription Details</h3>
          <div className="space-y-4">
            {enrichedPrescriptions
              .sort((a, b) => Number(b.issuedAt) - Number(a.issuedAt))
              .map((prescription, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {prescription.metadata?.medication || 'Unknown Medication'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {prescription.metadata?.dosage || 'Dosage not available'}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium`}
                      style={{
                        backgroundColor: `${STATUS_COLORS[prescription.status]}20`,
                        color: STATUS_COLORS[prescription.status],
                      }}
                    >
                      {STATUS_NAMES[prescription.status]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Issued:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(Number(prescription.issuedAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Expires:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(Number(prescription.expiresAt) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    {prescription.dispensedAt > 0n && (
                      <div>
                        <span className="text-gray-500">Dispensed:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(
                            Number(prescription.dispensedAt) * 1000
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {prescription.metadata?.quantity && (
                      <div>
                        <span className="text-gray-500">Quantity:</span>
                        <span className="ml-2 text-gray-900">
                          {prescription.metadata.quantity}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
