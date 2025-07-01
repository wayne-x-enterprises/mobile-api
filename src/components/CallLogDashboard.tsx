import React, { useState, useEffect } from 'react';
import { CallLog, CallLogFilters } from '../models/CallLog';
import { CallLogService } from '../services/CallLogService';

interface CallLogDashboardProps {
  supervisorId: string;
  onCallSelect?: (call: CallLog) => void;
}

export const CallLogDashboard: React.FC<CallLogDashboardProps> = ({
  supervisorId,
  onCallSelect
}) => {
  const [callLogService] = useState(() => new CallLogService());
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [liveCalls, setLiveCalls] = useState<CallLog[]>([]);
  const [stats, setStats] = useState({
    liveCalls: 0,
    totalMonitored: 0,
    averageDuration: 0,
    callsToday: 0
  });
  const [filters, setFilters] = useState<CallLogFilters>({});
  const [selectedTab, setSelectedTab] = useState<'live' | 'all' | 'today'>('live');

  useEffect(() => {
    loadCallLogs();
    loadLiveCalls();
    loadStats();
    
    // Refresh live calls every 30 seconds
    const interval = setInterval(() => {
      loadLiveCalls();
      loadStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [supervisorId]);

  const loadCallLogs = () => {
    const logs = callLogService.getSupervisorCallLogs(supervisorId);
    setCallLogs(logs);
  };

  const loadLiveCalls = () => {
    const live = callLogService.getLiveMonitoredCalls(supervisorId);
    setLiveCalls(live);
  };

  const loadStats = () => {
    const supervisorStats = callLogService.getSupervisorStats(supervisorId);
    setStats(supervisorStats);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: CallLog['status']): string => {
    switch (status) {
      case 'live': return '#10B981'; // green
      case 'ended': return '#6B7280'; // gray
      case 'on-hold': return '#F59E0B'; // yellow
      case 'transferred': return '#3B82F6'; // blue
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return '#EF4444'; // red
      case 'high': return '#F97316'; // orange
      case 'medium': return '#F59E0B'; // yellow
      case 'low': return '#10B981'; // green
      default: return '#6B7280';
    }
  };

  const getDisplayedCalls = (): CallLog[] => {
    switch (selectedTab) {
      case 'live':
        return liveCalls;
      case 'today':
        return callLogs.filter(log => 
          log.startTime.toDateString() === new Date().toDateString()
        );
      case 'all':
      default:
        return callLogs;
    }
  };

  const handleOneClickAccess = () => {
    // This is the main "one click" functionality
    loadLiveCalls();
    setSelectedTab('live');
  };

  return (
    <div className="call-log-dashboard" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Header with One-Click Access */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '20px',
        backgroundColor: '#F3F4F6',
        borderRadius: '8px'
      }}>
        <h1 style={{ margin: 0, color: '#1F2937' }}>Call Logs Dashboard</h1>
        <button
          onClick={handleOneClickAccess}
          style={{
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
        >
          🔴 One-Click Live Calls Access
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '14px' }}>Live Calls</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#10B981' }}>
            {stats.liveCalls}
          </p>
        </div>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '14px' }}>Total Monitored</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#3B82F6' }}>
            {stats.totalMonitored}
          </p>
        </div>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '14px' }}>Avg Duration</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#F59E0B' }}>
            {formatDuration(stats.averageDuration)}
          </p>
        </div>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '14px' }}>Calls Today</h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#8B5CF6' }}>
            {stats.callsToday}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '2px solid #E5E7EB', 
        marginBottom: '20px' 
      }}>
        {[
          { key: 'live', label: 'Live Calls', count: liveCalls.length },
          { key: 'today', label: 'Today', count: stats.callsToday },
          { key: 'all', label: 'All Calls', count: callLogs.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as any)}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: selectedTab === tab.key ? '2px solid #3B82F6' : '2px solid transparent',
              color: selectedTab === tab.key ? '#3B82F6' : '#6B7280',
              fontWeight: selectedTab === tab.key ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Call Logs List */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {getDisplayedCalls().length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
            <p>No calls found for the selected filter.</p>
          </div>
        ) : (
          getDisplayedCalls().map((call, index) => (
            <div
              key={call.id}
              onClick={() => onCallSelect?.(call)}
              style={{
                padding: '16px',
                borderBottom: index < getDisplayedCalls().length - 1 ? '1px solid #E5E7EB' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(call.status)
                      }}
                    />
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1F2937' }}>
                      {call.customer.name || call.customer.phoneNumber}
                    </h3>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: getPriorityColor(call.metadata.priority)
                      }}
                    >
                      {call.metadata.priority.toUpperCase()}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                    <span>Agent: {call.agentId}</span>
                    <span>Dept: {call.metadata.department}</span>
                    <span>Started: {formatTime(call.startTime)}</span>
                    {call.endTime && <span>Duration: {formatDuration(call.duration)}</span>}
                  </div>

                  {call.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {call.tags.map(tag => (
                        <span
                          key={tag}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#E5E7EB',
                            color: '#374151',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: call.status === 'live' ? '#10B981' : '#6B7280',
                    fontWeight: 'bold',
                    marginBottom: '4px'
                  }}>
                    {call.status.toUpperCase()}
                  </div>
                  {call.recording?.isRecorded && (
                    <div style={{ fontSize: '12px', color: '#EF4444' }}>
                      🔴 RECORDED
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CallLogDashboard;