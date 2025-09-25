import React, { useState, useEffect } from 'react';

const Unitreports = () => {
  const [animateReports, setAnimateReports] = useState(false);
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'submitted', 'approved', 'pending', 'rejected'

  useEffect(() => {
    setAnimateReports(false);
    const timer = setTimeout(() => setAnimateReports(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Sample data for unit requirements
  const requirementsData = {
    submitted: 45,
    approved: 32,
    pending: 8,
    rejected: 5,
    approvalRate: 71 // (approved / submitted) * 100
  };

  // Sample data for detailed views
  const sampleData = {
    submitted: [
      { id: 1, title: "Budget Request Form", date: "2024-01-15", department: "Finance", status: "Submitted" },
      { id: 2, title: "Equipment Purchase Request", date: "2024-01-14", department: "IT", status: "Submitted" },
      { id: 3, title: "Staff Training Proposal", date: "2024-01-13", department: "HR", status: "Submitted" },
      { id: 4, title: "Office Renovation Plan", date: "2024-01-12", department: "Admin", status: "Submitted" },
      { id: 5, title: "Software License Request", date: "2024-01-11", department: "IT", status: "Submitted" }
    ],
    approved: [
      { id: 1, title: "Budget Request Form", date: "2024-01-15", department: "Finance", approvedDate: "2024-01-16" },
      { id: 2, title: "Staff Training Proposal", date: "2024-01-13", department: "HR", approvedDate: "2024-01-14" },
      { id: 3, title: "Software License Request", date: "2024-01-11", department: "IT", approvedDate: "2024-01-12" },
      { id: 4, title: "Marketing Campaign Plan", date: "2024-01-10", department: "Marketing", approvedDate: "2024-01-11" }
    ],
    pending: [
      { id: 1, title: "Equipment Purchase Request", date: "2024-01-14", department: "IT", daysWaiting: 3 },
      { id: 2, title: "Office Renovation Plan", date: "2024-01-12", department: "Admin", daysWaiting: 5 },
      { id: 3, title: "New Hire Request", date: "2024-01-10", department: "HR", daysWaiting: 7 }
    ],
    rejected: [
      { id: 1, title: "Expensive Equipment Request", date: "2024-01-08", department: "IT", rejectedDate: "2024-01-09", reason: "Budget constraints" },
      { id: 2, title: "Unnecessary Travel Request", date: "2024-01-05", department: "Sales", rejectedDate: "2024-01-06", reason: "Not essential" }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Unit Requirements Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Submitted Requirements */}
          <div 
            className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow duration-300"
            onClick={() => setActiveView('submitted')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-800">Submitted</h3>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">📝</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-900 mb-2">{requirementsData.submitted}</div>
            <p className="text-blue-700 text-sm">Total Requirements</p>
          </div>
          
          {/* Approved Requirements */}
          <div 
            className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow duration-300"
            onClick={() => setActiveView('approved')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-800">Approved</h3>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✅</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-900 mb-2">{requirementsData.approved}</div>
            <p className="text-green-700 text-sm">Requirements Approved</p>
          </div>
          
          {/* Pending Requirements */}
          <div 
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow duration-300"
            onClick={() => setActiveView('pending')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-yellow-800">Pending</h3>
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">⏳</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-yellow-900 mb-2">{requirementsData.pending}</div>
            <p className="text-yellow-700 text-sm">Awaiting Review</p>
          </div>
          
          {/* Rejected Requirements */}
          <div 
            className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow duration-300"
            onClick={() => setActiveView('rejected')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-800">Rejected</h3>
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">❌</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-red-900 mb-2">{requirementsData.rejected}</div>
            <p className="text-red-700 text-sm">Requirements Rejected</p>
          </div>
        </div>

        {/* Approval Rate Chart */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <h3 className="text-md font-semibold text-purple-800 mb-3">Approval Rate</h3>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-700 font-medium text-sm">Overall Approval Rate</span>
                <span className="text-purple-900 font-bold text-lg">{requirementsData.approvalRate}%</span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-3">
                <div 
                  className="bg-purple-600 h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: animateReports ? `${requirementsData.approvalRate}%` : '0%'
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-purple-600 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            
            {/* Circular Progress */}
            <div className="ml-6 relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="6"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="6"
                  strokeDasharray={`${requirementsData.approvalRate * 2.199} ${(100 - requirementsData.approvalRate) * 2.199}`}
                  strokeDashoffset={animateReports ? "0" : "219.9"}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-purple-800">{requirementsData.approvalRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Views */}
        {activeView !== 'overview' && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800 capitalize">{activeView} Requirements</h3>
              <button 
                onClick={() => setActiveView('overview')}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                Back to Overview
              </button>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 max-h-96 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Submitted</th>
                    {activeView === 'approved' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Date</th>
                    )}
                    {activeView === 'pending' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Waiting</th>
                    )}
                    {activeView === 'rejected' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      </>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sampleData[activeView]?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.date}</td>
                      {activeView === 'approved' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approvedDate}</td>
                      )}
                      {activeView === 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.daysWaiting} days</td>
                      )}
                      {activeView === 'rejected' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.rejectedDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.reason}</td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          activeView === 'approved' ? 'bg-green-100 text-green-800' :
                          activeView === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          activeView === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {activeView === 'approved' ? 'Approved' :
                           activeView === 'pending' ? 'Pending' :
                           activeView === 'rejected' ? 'Rejected' :
                           'Submitted'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Unitreports;
