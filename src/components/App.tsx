import React, { useState } from 'react';
import { CallLog } from '../models/CallLog';
import { CallLogDashboard } from './CallLogDashboard';
import { CallLogViewer } from './CallLogViewer';

interface AppProps {
  supervisorId?: string;
}

export const App: React.FC<AppProps> = ({ 
  supervisorId = 'supervisor_001' 
}) => {
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCallSelect = (call: CallLog) => {
    setSelectedCall(call);
  };

  const handleCallUpdate = (updatedCall: CallLog) => {
    setSelectedCall(updatedCall);
    // Trigger a refresh of the dashboard
    setRefreshKey(prev => prev + 1);
  };

  const handleCloseViewer = () => {
    setSelectedCall(null);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#F3F4F6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #E5E7EB',
        padding: '16px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#1F2937' 
            }}>
              Call Monitoring System
            </h1>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '14px', 
              color: '#6B7280' 
            }}>
              Supervisor Dashboard - One Click Access to Live Calls
            </p>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px' 
          }}>
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#EBF8FF',
              borderRadius: '20px',
              border: '1px solid #3B82F6'
            }}>
              <span style={{ 
                fontSize: '14px', 
                color: '#1E40AF',
                fontWeight: '500'
              }}>
                👤 Supervisor: {supervisorId}
              </span>
            </div>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ 
              fontSize: '14px', 
              color: '#10B981',
              fontWeight: '500'
            }}>
              Online
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        padding: '0 24px'
      }}>
        <CallLogDashboard
          key={refreshKey}
          supervisorId={supervisorId}
          onCallSelect={handleCallSelect}
        />
      </main>

      {/* Call Log Viewer Modal */}
      {selectedCall && (
        <CallLogViewer
          call={selectedCall}
          onClose={handleCloseViewer}
          onUpdate={handleCallUpdate}
        />
      )}

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          background-color: #F3F4F6;
        }
        
        button:hover {
          transform: translateY(-1px);
          transition: transform 0.2s ease;
        }
        
        button:active {
          transform: translateY(0);
        }
        
        .call-log-dashboard {
          animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default App;