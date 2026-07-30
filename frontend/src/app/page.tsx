'use client';
import Link from 'next/link';
import { ArrowRight, Bot, Target, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem('makdi_token')) {
      setIsLoggedIn(true);
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-makdi-bg-light flex flex-col">
      {/* Navbar */}
      <nav className="border-b bg-white px-8 py-4 flex justify-between items-center">
        <div className="text-2xl font-black text-makdi-primary tracking-tight">🕸️ MAKDI</div>
        <div className="space-x-4">
          {isLoggedIn ? (
            <Link href="/dashboard" className="bg-makdi-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-makdi-primary-hover transition-colors">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 font-semibold hover:text-makdi-primary">Log in</Link>
              <Link href="/signup" className="bg-makdi-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-makdi-primary-hover transition-colors">
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="inline-block bg-green-100 text-makdi-primary font-bold px-4 py-1.5 rounded-full text-sm mb-6 border border-green-200 shadow-sm">
          100% Free & Open Source AI Job Matcher
        </div>
        
        <h1 className="text-6xl font-black text-gray-900 mb-6 max-w-4xl tracking-tight leading-tight">
          Your AI Copilot for <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-makdi-primary to-green-500">
            Landing Tech Jobs.
          </span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-10 max-w-2xl">
          Upload your resume once. MAKDI uses local AI to perfectly match you with jobs, auto-tailor your resume for every application, and track your success.
        </p>

        {isLoggedIn ? (
          <Link href="/dashboard" className="group bg-makdi-primary text-white text-lg px-8 py-4 rounded-xl font-bold hover:bg-makdi-primary-hover transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
            Enter Dashboard <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <Link href="/signup" className="group bg-makdi-primary text-white text-lg px-8 py-4 rounded-xl font-bold hover:bg-makdi-primary-hover transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
            Start Applying Faster <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl w-full mt-24">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Target className="text-makdi-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Matching</h3>
            <p className="text-gray-600 leading-relaxed">
              Our AI analyzes your skills and scores you against thousands of remote and tech jobs daily.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Bot className="text-makdi-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">AI Tailored Resumes</h3>
            <p className="text-gray-600 leading-relaxed">
              Automatically rewrite your resume and generate cover letters optimized for the exact job description.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <FileText className="text-makdi-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Chrome Autofill</h3>
            <p className="text-gray-600 leading-relaxed">
              Never type your name into Workday again. 1-click autofill your details into any job board.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
