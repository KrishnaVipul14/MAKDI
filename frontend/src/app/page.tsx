'use client';
import Link from 'next/link';
import { ArrowRight, Bot, Target, FileText, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-makdi-bg-light flex flex-col">
      {/* Navbar */}
      <nav className="border-b bg-white px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="text-2xl font-black text-makdi-primary tracking-tight">🕸️ MAKDI</div>
        <Link
          href="/dashboard"
          className="bg-makdi-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-makdi-primary-hover transition-colors"
        >
          Get Started Free →
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="inline-block bg-green-100 text-makdi-primary font-bold px-4 py-1.5 rounded-full text-sm mb-6 border border-green-200 shadow-sm">
          100% Free · No Sign-Up Required · AI-Powered
        </div>

        <h1 className="text-6xl font-black text-gray-900 mb-6 max-w-4xl tracking-tight leading-tight">
          Upload Resume. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-makdi-primary to-green-500">
            Get Matched Instantly.
          </span>
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl">
          Drop your resume and MAKDI's AI instantly matches you with thousands of real jobs from top companies — no sign-up, no forms, no nonsense.
        </p>

        <Link
          href="/dashboard"
          className="group bg-makdi-primary text-white text-lg px-8 py-4 rounded-xl font-bold hover:bg-makdi-primary-hover transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          Upload Resume & Find Jobs <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </Link>

        <p className="text-sm text-gray-400 mt-4">No account needed. Your resume stays on your device.</p>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl w-full mt-24">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Zap className="text-makdi-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Match</h3>
            <p className="text-gray-600 leading-relaxed">
              Upload your resume once. We parse your skills and instantly score thousands of live jobs from Airbnb, Spotify, Discord, and 90+ top companies.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Bot className="text-makdi-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Tailored Resume</h3>
            <p className="text-gray-600 leading-relaxed">
              One click tailors your resume to a specific job description using Gemini AI — rewrites bullets, reorders skills, boosts your ATS score.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <FileText className="text-makdi-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Chrome Autofill</h3>
            <p className="text-gray-600 leading-relaxed">
              Never type your name into Workday again. Install the free extension and autofill your details into any job board in one click.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
