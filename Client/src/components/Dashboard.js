import React, { useState, useEffect } from 'react';
import Reports from './Reports';
import Offices from './Offices';
import Users from './Users';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [animateReports, setAnimateReports] = useState(false);
  const [selectedYearRange, setSelectedYearRange] = useState('2021-2023');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chartAnimation, setChartAnimation] = useState(false);

  useEffect(() => {
    if (activeSection === 'reports') {
      setAnimateReports(false);
      const timer = setTimeout(() => setAnimateReports(true), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimateReports(false);
    }
  }, [activeSection]);

  useEffect(() => {
    setChartAnimation(true);
  }, []);

  // Year range data
  const yearRangeData = {
    '2021-2023': {
      total: 1000,
      years: [
        { year: '2021', value: 300, percentage: 30 },
        { year: '2022', value: 500, percentage: 50 },
        { year: '2023', value: 200, percentage: 20 }
      ],
      chartPath1: 'M 0 140 L 100 120 L 200 100 L 300 80 L 400 60 L 500 70 L 600 50 L 700 40 L 800 30 L 800 160 L 0 160 Z',
      chartPath2: 'M 0 120 L 100 100 L 200 80 L 300 90 L 400 70 L 500 85 L 600 75 L 700 65 L 800 60 L 800 160 L 0 160 Z'
    },
    '2018-2020': {
      total: 2000,
      years: [
        { year: '2018', value: 800, percentage: 40 },
        { year: '2019', value: 700, percentage: 35 },
        { year: '2020', value: 500, percentage: 25 }
      ],
      chartPath1: 'M 0 120 L 100 110 L 200 90 L 300 70 L 400 50 L 500 60 L 600 40 L 700 30 L 800 20 L 800 160 L 0 160 Z',
      chartPath2: 'M 0 100 L 100 90 L 200 70 L 300 80 L 400 60 L 500 75 L 600 65 L 700 55 L 800 50 L 800 160 L 0 160 Z'
    },
    '2015-2017': {
      total: 1500,
      years: [
        { year: '2015', value: 400, percentage: 27 },
        { year: '2016', value: 600, percentage: 40 },
        { year: '2017', value: 500, percentage: 33 }
      ],
      chartPath1: 'M 0 130 L 100 125 L 200 110 L 300 95 L 400 80 L 500 85 L 600 70 L 700 60 L 800 50 L 800 160 L 0 160 Z',
      chartPath2: 'M 0 110 L 100 105 L 200 90 L 300 100 L 400 85 L 500 95 L 600 85 L 700 75 L 800 70 L 800 160 L 0 160 Z'
    }
  };

  const handleYearRangeChange = (yearRange) => {
    setChartAnimation(false);
    setSelectedYearRange(yearRange);
    setIsDropdownOpen(false);
    setTimeout(() => setChartAnimation(true), 100);
  };

  const currentData = yearRangeData[selectedYearRange];

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 shadow-lg">
        {/* User Profile */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-medium-gray to-dark-charcoal rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">U</span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">User Name</h3>
              <p className="text-gray-400 text-xs">Administrator</p>
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
                  ? 'bg-medium-gray text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3">📊</span>
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveSection('offices')}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
                activeSection === 'offices' 
                  ? 'bg-medium-gray text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3">🏢</span>
              Offices
            </button>
            
            <button
              onClick={() => setActiveSection('reports')}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
                activeSection === 'reports' 
                  ? 'bg-medium-gray text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3">📈</span>
              Reports
            </button>
            
            <button
              onClick={() => setActiveSection('users')}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg mb-2 transition-colors ${
                activeSection === 'users' 
                  ? 'bg-medium-gray text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3">👥</span>
              Users
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
      <div className="flex-1 bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800 capitalize">{activeSection}</h1>
            <div className="text-sm text-gray-600">
              Goal Completion
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Sales Chart Section with Goal Completion */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Chart Section */}
                  <div className="lg:col-span-2">
                    <div className="mb-4">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-800">Year:</h3>
                        <div className="relative">
                          <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center space-x-2"
                          >
                            <span>{selectedYearRange}</span>
                            <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {isDropdownOpen && (
                            <div className="absolute left-0 mt-2 w-32 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                              {Object.keys(yearRangeData).map((yearRange) => (
                                <button
                                  key={yearRange}
                                  onClick={() => handleYearRangeChange(yearRange)}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg ${
                                    selectedYearRange === yearRange ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                  }`}
                                >
                                  {yearRange}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Chart Container */}
                    <div className="relative h-80 bg-gray-50 rounded-lg p-4">
                      <svg className="w-full h-full" viewBox="0 0 800 160">
                        {/* Grid Lines */}
                        <defs>
                          <linearGradient id="blueAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{stopColor: '#3B82F6', stopOpacity: 0.6}} />
                            <stop offset="100%" style={{stopColor: '#3B82F6', stopOpacity: 0.1}} />
                          </linearGradient>
                          <linearGradient id="grayAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{stopColor: '#9CA3AF', stopOpacity: 0.4}} />
                            <stop offset="100%" style={{stopColor: '#9CA3AF', stopOpacity: 0.1}} />
                          </linearGradient>
                        </defs>
                        
                        {/* Gray Background Area */}
                        <path
                          d={currentData.chartPath2}
                          fill="url(#grayAreaGradient)"
                          className={`transition-all duration-700 ease-in-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
                        />
                        
                        {/* Blue Area Chart */}
                        <path
                          d={currentData.chartPath1}
                          fill="url(#blueAreaGradient)"
                          className={`transition-all duration-700 ease-in-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
                        />
                        
                        {/* Blue Line */}
                        <path
                          d={currentData.chartPath1.replace(' L 800 160 L 0 160 Z', '')}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          className={`transition-all duration-700 ease-in-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
                        />
                        
                        {/* Gray Line */}
                        <path
                          d={currentData.chartPath2.replace(' L 800 160 L 0 160 Z', '')}
                          fill="none"
                          stroke="#9CA3AF"
                          strokeWidth="2"
                          className={`transition-all duration-700 ease-in-out ${chartAnimation ? 'opacity-100' : 'opacity-0'}`}
                        />
                      </svg>
                      
                      {/* Chart Labels */}
                      <div className="absolute bottom-1 left-0 right-0 flex justify-between text-xs text-gray-600 px-2">
                        <span>January</span>
                        <span>February</span>
                        <span>March</span>
                        <span>April</span>
                        <span>May</span>
                        <span>June</span>
                        <span>July</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Goal Completion Section */}
                  <div className="lg:col-span-1 flex flex-col justify-center">
                    
                    <div className="space-y-4">
                      {/* Total */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Total</span>
                          <span className="text-sm text-gray-800 font-semibold">{currentData.total}</span>
                        </div>
                        <div className="w-full bg-gray-300 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full transition-all duration-700 ease-in-out" style={{width: '100%'}}></div>
                        </div>
                      </div>
                      
                      {currentData.years.map((yearData, index) => {
                        const colors = ['bg-red-500', 'bg-green-500', 'bg-yellow-500'];
                        return (
                          <div key={yearData.year}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-600">{yearData.year}</span>
                              <span className="text-sm text-gray-800 font-semibold">{yearData.value}</span>
                            </div>
                            <div className="w-full bg-gray-300 rounded-full h-2">
                              <div 
                                className={`${colors[index]} h-2 rounded-full transition-all duration-700 ease-in-out`} 
                                style={{width: `${yearData.percentage}%`}}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeSection === 'offices' && (
            <Offices />
          )}

          {activeSection === 'users' && (
            <Users />
          )}

          {activeSection === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports Management</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {/* Request Trends */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">Request Trends</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700">This Month</span>
                        <span className="text-blue-900 font-semibold">1,245</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700">Last Month</span>
                        <span className="text-blue-900 font-semibold">987</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700">Growth</span>
                        <span className="text-green-600 font-semibold">+26%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-4">
                        <div className="bg-blue-600 h-2 rounded-full w-3/4"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Request Costs */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">Request Costs</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700">Processing</span>
                        <span className="text-green-900 font-semibold">$45,200</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-green-700">Review</span>
                        <span className="text-green-900 font-semibold">$12,800</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-green-700">Admin</span>
                        <span className="text-green-900 font-semibold">$8,500</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-green-300 pt-2">
                        <span className="text-green-800 font-semibold">Total</span>
                        <span className="text-green-900 font-bold text-lg">$66,500</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Approve/Reject Chart */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-800 mb-4">Approve vs Reject</h3>
                    <div className="flex items-center justify-center">
                      <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Approved - 78% */}
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="15"
                            strokeDasharray="171.1 47.7"
                            strokeDashoffset={animateReports ? "0" : "218.8"}
                            className="transition-all duration-[1800ms] ease-out"
                          />
                          {/* Rejected - 22% */}
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="15"
                            strokeDasharray="48.2 170.6"
                            strokeDashoffset={animateReports ? "-171.1" : "-122.9"}
                            className="transition-all duration-[1800ms] ease-out"
                            style={{
                              transitionDelay: '400ms'
                            }}
                          />
                        </svg>
                      </div>
                      <div className="ml-4 space-y-2">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                          <span className="text-purple-800 text-sm font-medium">78% Approved</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                          <span className="text-purple-800 text-sm font-medium">22% Rejected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
        </main>
        
      </div>
    </div>
  );
};

export default Dashboard;
