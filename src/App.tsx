/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import LoginScreen from './screens/LoginScreen';
import TeacherDashboard from './screens/TeacherDashboard';
import PrincipalDashboard from './screens/PrincipalDashboard';
import { AnimatePresence, motion } from 'motion/react';
import { dutyService } from './lib/dutyService';

type Role = 'teacher' | 'principal' | null;

export default function App() {
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    dutyService.seedInitialData();
  }, []);

  const handleLogin = (selectedRole: Role) => {
    setRole(selectedRole);
  };

  const handleLogout = () => {
    setRole(null);
  };

  return (
    <div className="max-w-md mx-auto h-screen relative bg-stone overflow-x-hidden">
      <AnimatePresence mode="wait">
        {!role ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <LoginScreen onLogin={handleLogin} />
          </motion.div>
        ) : role === 'teacher' ? (
          <motion.div
            key="teacher"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
          >
            <TeacherDashboard onLogout={handleLogout} />
          </motion.div>
        ) : (
          <motion.div
            key="principal"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
          >
            <PrincipalDashboard onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

