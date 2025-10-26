"use client";

import Link from 'next/link';
import { WalletStatus } from '@/components/WalletStatus';
import { useAccount } from 'wagmi';
import { useMyCredential } from '@/lib/hooks/useCredential';
import { CredentialType } from '@/lib/contracts/config';
import { motion } from 'framer-motion';
import { Stethoscope, Pill, User } from 'lucide-react';

// Animation variants for smooth scroll-in effects
const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 }
};

export default function Home() {
  const { isConnected } = useAccount();
  const { credential, isLoading } = useMyCredential();

  const getDashboardLink = () => {
    if (!isConnected || isLoading || !credential) return null;

    if (credential.credentialType === CredentialType.Doctor) {
      return '/doctor';
    } else if (credential.credentialType === CredentialType.Pharmacist) {
      return '/pharmacist';
    }
    return null;
  };

  const dashboardLink = getDashboardLink();

  return (
    <div className="min-h-screen bg-black">
      {/* Modern Nav with glassmorphism */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="container mx-auto px-6 lg:px-12 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
                <span className="text-white font-black text-xl" aria-hidden="true">M</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                MedChain
              </h1>
            </div>
            <WalletStatus />
          </div>
        </div>
      </header>

      <main className="pt-20">
        {/* Hero Section - Enterprise-level with CTAs */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900">
          {/* Animated gradient orbs */}
          <div className="absolute top-0 -left-4 w-96 h-96 bg-gradient-to-br from-blue-600/30 via-cyan-500/20 to-transparent rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-600/30 via-pink-500/20 to-transparent rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-br from-red-600/20 via-orange-500/10 to-transparent rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          
          <div className="relative container mx-auto px-6 lg:px-12 py-24 lg:py-32">
            <motion.div 
              className="max-w-5xl"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              {/* Badge */}
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 border border-blue-500/30 rounded-full text-sm font-semibold text-blue-400 mb-8 backdrop-blur-sm shadow-lg shadow-blue-500/10">
                <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                <span>POWERED BY BASE BLOCKCHAIN</span>
              </motion.div>
              
              {/* Main headline - Databricks style */}
              <motion.h1 
                variants={fadeInUp}
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-bold mb-8 leading-[1.1] tracking-tight"
              >
                <span className="text-white">Transform healthcare with</span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  blockchain-powered prescriptions
                </span>
              </motion.h1>
              
              <motion.p 
                variants={fadeInUp}
                className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-3xl leading-relaxed font-light"
              >
                Secure, verifiable, and transparent prescription management with cryptographic verification and zero-trust architecture
              </motion.p>

              {/* CTA Buttons - Databricks style */}
              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4 mb-16"
              >
                {dashboardLink ? (
                  <Link
                    href={dashboardLink}
                    className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50 border border-blue-500/50"
                  >
                    <span>Go to Dashboard</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="#features"
                      className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50 border border-blue-500/50"
                    >
                      <span>Get Started</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                    <Link
                      href="#how-it-works"
                      className="group inline-flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all border border-white/10 hover:border-white/20 backdrop-blur-sm"
                    >
                      <span>See How It Works</span>
                      <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Link>
                  </>
                )}
              </motion.div>

              {/* Trust indicators */}
              <motion.div 
                variants={fadeInUp}
                className="flex flex-wrap items-center gap-8 text-sm text-gray-400"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Blockchain verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">HIPAA compliant</span>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Gradient separator */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </section>

        {/* Connection States Section - Clean enterprise layout */}
        <section className="relative py-20 bg-black">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto">
              {!isConnected ? (
                <motion.div 
                  {...scaleIn}
                  className="relative overflow-hidden bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5 rounded-3xl border border-white/10 p-12 backdrop-blur-sm"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full filter blur-3xl"></div>
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/50">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold mb-4 text-white text-center">Connect Your Wallet</h3>
                    <p className="text-lg text-gray-400 mb-8 text-center max-w-2xl mx-auto">
                      Healthcare providers need to connect their wallet to access the platform and begin issuing or verifying prescriptions
                    </p>
                    <div className="flex justify-center">
                      <WalletStatus />
                    </div>
                  </div>
                </motion.div>
              ) : dashboardLink ? (
                <motion.div 
                  {...scaleIn}
                  className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-blue-500/10 rounded-3xl border border-blue-500/30 p-12 backdrop-blur-sm"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full filter blur-3xl"></div>
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/50">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold mb-4 text-white text-center">Welcome Back!</h3>
                    <p className="text-lg text-gray-300 mb-8 text-center">
                      You have a verified <span className="font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{credential?.credentialType === CredentialType.Doctor ? 'Doctor' : 'Pharmacist'}</span> credential
                    </p>
                    <div className="flex justify-center">
                      <Link
                        href={dashboardLink}
                        className="group inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-10 py-5 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50"
                      >
                        <span>Go to Dashboard</span>
                        <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  {...scaleIn}
                  className="relative overflow-hidden bg-gradient-to-br from-red-500/10 via-orange-500/5 to-red-500/10 rounded-3xl border border-red-500/30 p-12 backdrop-blur-sm"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full filter blur-3xl"></div>
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-red-500/50">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold mb-4 text-white text-center">Credential Verification Required</h3>
                    <p className="text-lg text-gray-300 mb-8 text-center max-w-2xl mx-auto">
                      You don't have a verified credential yet. Healthcare providers must undergo KYC verification to access the platform.
                    </p>
                    <div className="flex justify-center">
                      <Link
                        href="/apply"
                        className="group inline-flex items-center gap-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-10 py-5 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/50"
                      >
                        <span>Apply for Credentials</span>
                        <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Features/Product Grid Section */}
        <section id="features" className="relative py-24 bg-gradient-to-b from-black via-gray-900 to-black">
          <div className="container mx-auto px-6 lg:px-12">
            {/* Section Header */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
                Built for modern healthcare
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                Enterprise-grade security meets seamless user experience
              </p>
            </motion.div>

            {/* Feature Cards Grid */}
            <motion.div 
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
            >
              <motion.div variants={fadeInUp}>
                <Link 
                  href="/doctor" 
                  className="group relative block h-full"
                >
                  <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-3xl border border-white/10 hover:border-blue-500/50 p-10 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 h-full"
                  >
                    {/* Hover gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-cyan-500/5 group-hover:to-blue-500/10 transition-all duration-500"></div>
                    
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform duration-300">
                        <Stethoscope className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">For Doctors</h3>
                      <p className="text-gray-400 leading-relaxed mb-6 text-base">
                        Issue prescriptions with cryptographic verification and secure patient data management on the blockchain
                      </p>
                      <div className="flex items-center text-blue-400 font-semibold group-hover:gap-2 transition-all">
                        <span>Learn more</span>
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Link 
                  href="/pharmacist" 
                  className="group relative block h-full"
                >
                  <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-3xl border border-white/10 hover:border-purple-500/50 p-10 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20 h-full"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-pink-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:via-pink-500/5 group-hover:to-purple-500/10 transition-all duration-500"></div>
                    
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform duration-300">
                        <Pill className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-purple-400 transition-colors">For Pharmacists</h3>
                      <p className="text-gray-400 leading-relaxed mb-6 text-base">
                        Verify and dispense prescriptions securely with instant blockchain authentication and full audit trails
                      </p>
                      <div className="flex items-center text-purple-400 font-semibold group-hover:gap-2 transition-all">
                        <span>Learn more</span>
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Link 
                  href="/patient" 
                  className="group relative block h-full sm:col-span-2 lg:col-span-1"
                >
                  <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-3xl border border-white/10 hover:border-green-500/50 p-10 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/20 h-full"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 via-emerald-500/0 to-green-500/0 group-hover:from-green-500/10 group-hover:via-emerald-500/5 group-hover:to-green-500/10 transition-all duration-500"></div>
                    
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform duration-300">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-green-400 transition-colors">For Patients</h3>
                      <p className="text-gray-400 leading-relaxed mb-6 text-base">
                        View prescriptions with simple QR code access — no wallet required, just secure and private access to your medical records
                      </p>
                      <div className="flex items-center text-green-400 font-semibold group-hover:gap-2 transition-all">
                        <span>Learn more</span>
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Gradient separator */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </section>

        {/* How It Works Section - Enterprise layout */}
        <section id="how-it-works" className="relative py-24 bg-black">
          <div className="container mx-auto px-6 lg:px-12">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm font-semibold text-blue-400 mb-6">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>HOW IT WORKS</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">
                Four steps to secure healthcare
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                From verification to dispensing, every step is secured by blockchain technology
              </p>
            </motion.div>
            
            <motion.div 
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto"
            >
              <motion.div variants={fadeInUp} className="group relative overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-2xl p-8 border border-white/10 hover:border-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/10">
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors">Healthcare Providers Get Verified</h4>
                    <p className="text-gray-400 leading-relaxed">
                      Doctors and pharmacists undergo secure KYC verification and receive non-transferable credential tokens on the blockchain
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="group relative overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-2xl p-8 border border-white/10 hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/10">
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-3 text-white group-hover:text-purple-400 transition-colors">Doctors Issue Prescriptions</h4>
                    <p className="text-gray-400 leading-relaxed">
                      Create prescriptions on-chain with cryptographic hashes and patient data stored securely on IPFS with end-to-end encryption
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="group relative overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-2xl p-8 border border-white/10 hover:border-green-500/30 transition-all hover:shadow-xl hover:shadow-green-500/10">
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-3 text-white group-hover:text-green-400 transition-colors">Patients Receive QR Codes</h4>
                    <p className="text-gray-400 leading-relaxed">
                      No wallet needed — patients receive secure QR codes containing encrypted access credentials for their prescriptions
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="group relative overflow-hidden bg-gradient-to-br from-white/[0.07] to-white/[0.02] rounded-2xl p-8 border border-white/10 hover:border-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/10">
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-3 text-white group-hover:text-orange-400 transition-colors">Pharmacists Verify & Dispense</h4>
                    <p className="text-gray-400 leading-relaxed">
                      Scan QR codes to instantly verify prescription authenticity via blockchain and dispense medications securely with full audit trails
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Trust/Stats Section - Databricks style */}
        <section className="relative py-24 bg-gradient-to-b from-black via-gray-900 to-black">
          <div className="container mx-auto px-6 lg:px-12">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-16 text-white">
                Trusted by healthcare professionals
              </h2>
              <div className="grid sm:grid-cols-3 gap-12 max-w-4xl mx-auto">
                <div>
                  <div className="text-5xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">100%</div>
                  <div className="text-gray-400 font-medium">Blockchain Verified</div>
                </div>
                <div>
                  <div className="text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">E2E</div>
                  <div className="text-gray-400 font-medium">Encrypted</div>
                </div>
                <div>
                  <div className="text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">Zero</div>
                  <div className="text-gray-400 font-medium">Trust Architecture</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer - Enterprise style */}
      <footer className="relative border-t border-white/10 bg-black">
        <div className="container mx-auto px-6 lg:px-12 py-12">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <span className="text-white font-black text-xl">M</span>
                </div>
                <span className="text-2xl font-black text-white tracking-tight">MedChain</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Secure, verifiable, and transparent prescription management powered by blockchain technology.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/doctor" className="text-gray-400 hover:text-white transition-colors text-sm">
                    For Doctors
                  </Link>
                </li>
                <li>
                  <Link href="/pharmacist" className="text-gray-400 hover:text-white transition-colors text-sm">
                    For Pharmacists
                  </Link>
                </li>
                <li>
                  <Link href="/patient" className="text-gray-400 hover:text-white transition-colors text-sm">
                    For Patients
                  </Link>
                </li>
                <li>
                  <Link href="/apply" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Apply for Credentials
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Administrator
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-white font-bold mb-4">Resources</h4>
              <ul className="space-y-3">
                <li>
                  <a href="https://docs.base.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://base.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Built on Base
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">
                © 2025 MedChain. Built for <span className="font-semibold text-blue-400">CalHacks 12.0</span>
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Powered by <span className="font-semibold text-blue-400">Base</span>
                </span>
                <span>•</span>
                <span className="font-semibold text-purple-400">OnChainKit</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
