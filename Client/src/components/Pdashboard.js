import React, { useState, useEffect } from 'react';
import Preports from './Preports';

const Pdashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [chartAnimation, setChartAnimation] = useState(false);

  useEffect(() => {
    setChartAnimation(true);
  }, []);

  // Static data for the dashboard
  const dashboardData = {
    total: 1000,
    years: [
      { year: '2021', value: 300, percentage: 30 },
      { year: '2022', value: 500, percentage: 50 },
      { year: '2023', value: 200, percentage: 20 }
    ],
    chartPath1: 'M 0 140 L 100 120 L 200 100 L 300 80 L 400 60 L 500 70 L 600 50 L 700 40 L 800 30 L 800 160 L 0 160 Z',
    chartPath2: 'M 0 120 L 100 100 L 200 80 L 300 90 L 400 70 L 500 85 L 600 75 L 700 65 L 800 60 L 800 160 L 0 160 Z'
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-dark-charcoal to-darker-charcoal text-white relative">
        {/* Logo/Header */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">BloomNode</h1>
          <p className="text-gray-400 text-sm mt-1">President Dashboard</p>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">P</span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">President</h3>
              <p className="text-gray-400 text-xs">Executive</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          <div className="px-4">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
                activeSection === 'dashboard' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3">📊</span>
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveSection('reports')}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
                activeSection === 'reports' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3">📈</span>
              Reports
            </button>
          </div>
          
        </nav>
        
        {/* Logout Button */}
        <div className="absolute bottom-6 left-4">
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-red-500 text-white py-2 px-14 rounded-lg font-medium transition-all duration-300 hover:bg-red-600 shadow-lg"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">President Dashboard</h2>
              <p className="text-gray-600 text-sm">Welcome to your executive dashboard</p>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Main Content Area */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                {/* Empty content area */}
              </div>
            </div>
          )}

          {activeSection === 'reports' && (
            <Preports />
          )}
        </main>
      </div>
    </div>
  );
};

export default Pdashboard;
