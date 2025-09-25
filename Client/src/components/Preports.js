import React, { useState, useEffect } from 'react';

const Preports = () => {
  const [animateReports, setAnimateReports] = useState(false);

  useEffect(() => {
    setAnimateReports(false);
    const timer = setTimeout(() => setAnimateReports(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Executive Reports Management</h2>
        
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
  );
};

export default Preports;
