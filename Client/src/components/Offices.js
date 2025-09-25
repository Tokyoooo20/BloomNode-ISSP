import React, { useEffect, useState } from 'react';

const Offices = () => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Offices Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Request Trends */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Request Trends</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">New Requests</span>
                <span className="text-blue-900 font-semibold">245</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Pending Reviews</span>
                <span className="text-blue-900 font-semibold">89</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Completed</span>
                <span className="text-blue-900 font-semibold">1,567</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-4">
                <div className="bg-blue-600 h-2 rounded-full w-3/4"></div>
              </div>
              <p className="text-blue-600 text-sm">75% completion rate this month</p>
            </div>
          </div>
          
          {/* ISSP Request Tracking */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">ISSP Request Tracking</h3>
              <div className="relative">
                <select className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="FACET">FACET</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              {/* Office List with Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-800 font-medium">BSIT</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Submitted</span>
                    <span className="text-gray-600 text-sm">2 days ago</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-800 font-medium">BSCE</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Not Submitted</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-800 font-medium">BITM</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Submitted</span>
                    <span className="text-gray-600 text-sm">1 day ago</span>
                  </div>
                </div>
                
                
              </div>
              
              {/* Summary Stats */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-600">2</div>
                    <div className="text-xs text-gray-700">Submitted</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">1</div>
                    <div className="text-xs text-gray-700">Not Submitted</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Offices;
