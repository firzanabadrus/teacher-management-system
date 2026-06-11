import { useState } from 'react';
import { User, ShieldCheck, Mail, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLogin: (role: 'teacher' | 'principal') => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Decorative notch effect for mobile feel */}
      <div className="h-6 w-32 bg-[#202020] absolute top-0 left-1/2 -translate-x-1/2 rounded-b-2xl z-10 hidden sm:block"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[320px]"
      >
        <div className="mb-12">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-semibold text-text-main tracking-tight">EduCare TMS</h1>
          <p className="text-text-dim mt-1 text-sm font-medium">Teacher Management System</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input 
              type="email" 
              placeholder="Email address"
              className="w-full h-12 px-4 bg-bg-input rounded-xl border-none text-sm text-text-main focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-text-subtle"
              defaultValue="demo@school.edu"
            />
          </div>
          <div className="relative">
            <input 
              type="password" 
              placeholder="Password"
              className="w-full h-12 px-4 bg-bg-input rounded-xl border-none text-sm text-text-main focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-text-subtle"
              defaultValue="password123"
            />
          </div>
        </div>

        <div className="mt-12 space-y-3 pb-8">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onLogin('teacher')}
            className="w-full h-12 bg-primary text-white rounded-xl font-medium text-sm shadow-sm flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" />
            Login as Teacher
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onLogin('principal')}
            className="w-full h-12 bg-secondary text-white rounded-xl font-medium text-sm shadow-sm flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Login as Principal
          </motion.button>
        </div>

        <p className="text-center text-text-subtle text-[10px] uppercase font-bold tracking-widest">
          Secure Workplace Access
        </p>
      </motion.div>
    </div>
  );
}
