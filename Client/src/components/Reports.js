import React from 'react';

const Reports = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Monthly Reports</h3>
            <p className="text-blue-600 text-sm">Generate monthly performance reports</p>
            <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
              Generate Report
            </button>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Sales Reports</h3>
            <p className="text-green-600 text-sm">View detailed sales analytics</p>
            <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
              View Sales
            </button>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">Custom Reports</h3>
            <p className="text-purple-600 text-sm">Create custom report templates</p>
            <button className="mt-4 bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600 transition-colors">
              Create Custom
            </button>
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Reports</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">Q3 Financial Report</span>
                <span className="text-sm text-gray-500">2 days ago</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">Sales Performance Report</span>
                <span className="text-sm text-gray-500">1 week ago</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Monthly Analytics</span>
                <span className="text-sm text-gray-500">2 weeks ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
