'use client'

import SignInForm from '@/components/auth/SignInForm'

export default function AdminSignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <SignInForm />
      </div>
      
      {/* Right side - Image/Background */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Admin Portal</h2>
            <p className="text-xl opacity-90">FireMarkets Administration</p>
          </div>
        </div>
      </div>
    </div>
  )
}