"use client";

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    console.log('Navigating to login page...');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-500 to-purple-500 bg-purple-500">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-white">TaskMaster</span>
          </div>
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-white hover:text-gray-200">Home</Link>
            <Link href="/features" className="text-white hover:text-gray-200">Features</Link>
            <Link href="/testimonial" className="text-white hover:text-gray-200">Testimonial</Link>
            <Link href="/pricing" className="text-white hover:text-gray-200">Pricing</Link>
            <Link
              href="/login"
              className="bg-white text-purple-600 px-4 py-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="flex flex-col items-center">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your digital business is in<br />good hands with us!
            </h1>
            <p className="text-lg text-gray-100 mb-8 max-w-2xl mx-auto">
              Make your work easier with an integrated ecosystem
              that lets all departments work properly together.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={handleGetStarted}
                className="bg-pink-500 text-white px-8 py-3 rounded-full hover:bg-pink-600 transition-colors"
              >
                Get Started
              </button>
              <button className="bg-purple-700 text-white px-8 py-3 rounded-full hover:bg-purple-800 transition-colors flex items-center gap-2">
                <span>Watch Video</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Dashboard Preview with Image */}
          <div className="relative w-full max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-xl p-4">
              <Image
                src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
                alt="Dashboard Preview"
                width={1000}
                height={600}
                className="rounded-lg"
              />
            </div>
          </div>

          {/* Features Section with Images */}
          <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <Image
                src="https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
                alt="Task Organization"
                width={400}
                height={300}
                className="rounded-lg mb-4"
              />
              <h3 className="text-xl font-bold mb-2 text-gray-900">Task Organization</h3>
              <p className="text-gray-600">
                Organize your tasks with intuitive categories and priorities
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <Image
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
                alt="Progress Tracking"
                width={400}
                height={300}
                className="rounded-lg mb-4"
              />
              <h3 className="text-xl font-bold mb-2 text-gray-900">Progress Tracking</h3>
              <p className="text-gray-600">
                Monitor your progress and stay on top of deadlines
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <Image
                src="https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
                alt="Boost Productivity"
                width={400}
                height={300}
                className="rounded-lg mb-4"
              />
              <h3 className="text-xl font-bold mb-2 text-gray-900">Boost Productivity</h3>
              <p className="text-gray-600">
                Get more done with smart task management tools
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 