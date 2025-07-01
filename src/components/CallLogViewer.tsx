import React, { useState } from 'react';
import { CallLog } from '../models/CallLog';
import { CallLogService } from '../services/CallLogService';

interface CallLogViewerProps {
  call: CallLog;
  onClose: () => void;
  onUpdate?: (updatedCall: CallLog) => void;
}

export const CallLogViewer: React.FC<CallLogViewerProps> = ({
  call,
  onClose,
  onUpdate
}) => {
  const [callLogService] = useState(() => new CallLogService());
  const [notes, setNotes] = useState(call.notes || '');
  const [newTag, setNewTag] = useState('');
  const [isEditing, setIsEditing] = useState(false);

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

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString();
  };

  const getStatusColor = (status: CallLog['status']): string => {
    switch (status) {
      case 'live': return '#10B981';
      case 'ended': return '#6B7280';
      case 'on-hold': return '#F59E0B';
      case 'transferred': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const handleSaveNotes = () => {
    const updatedCall = callLogService.updateCallNotes(call.id, notes);
    if (updatedCall && onUpdate) {
      onUpdate(updatedCall);
    }
    setIsEditing(false);
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      const updatedCall = callLogService.addCallTags(call.id, [newTag.trim()]);
      if (updatedCall && onUpdate) {
        onUpdate(updatedCall);
      }
      setNewTag('');
    }
  };

  const handleEndCall = (outcome?: CallLog['metadata']['outcome']) => {
    if (call.status === 'live') {
      const updatedCall = callLogService.endCall(call.id, outcome);
      if (updatedCall && onUpdate) {
        onUpdate(updatedCall);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90%',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #E5E7EB'
        }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', color: '#1F2937', fontSize: '24px' }}>
              Call Details
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(call.status)
                }}
              />
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>
                {call.status.toUpperCase()}
              </span>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: getPriorityColor(call.metadata.priority)
                }}
              >
                {call.metadata.priority.toUpperCase()} PRIORITY
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Call Information Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '24px',
          marginBottom: '24px'
        }}>
          {/* Customer Information */}
          <div style={{ 
            backgroundColor: '#F9FAFB', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #E5E7EB'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>
              Customer Information
            </h3>
            <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Name:</strong> {call.customer.name || 'Unknown'}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Phone:</strong> {call.customer.phoneNumber}
              </p>
              {call.customer.id && (
                <p style={{ margin: '4px 0' }}>
                  <strong>Customer ID:</strong> {call.customer.id}
                </p>
              )}
            </div>
          </div>

          {/* Call Details */}
          <div style={{ 
            backgroundColor: '#F9FAFB', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #E5E7EB'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>
              Call Details
            </h3>
            <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Agent:</strong> {call.agentId}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Department:</strong> {call.metadata.department}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Direction:</strong> {call.metadata.direction}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Started:</strong> {formatDateTime(call.startTime)}
              </p>
              {call.endTime && (
                <p style={{ margin: '4px 0' }}>
                  <strong>Ended:</strong> {formatDateTime(call.endTime)}
                </p>
              )}
              <p style={{ margin: '4px 0' }}>
                <strong>Duration:</strong> {formatDuration(call.duration)}
              </p>
            </div>
          </div>

          {/* Quality Metrics */}
          <div style={{ 
            backgroundColor: '#F9FAFB', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #E5E7EB'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>
              Call Quality
            </h3>
            <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Audio Quality:</strong> {call.quality.audioQuality}/5 ⭐
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Connection:</strong> {call.quality.connectionStability}/5 📶
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Monitored:</strong> {call.isMonitored ? '✅ Yes' : '❌ No'}
              </p>
            </div>
          </div>

          {/* Recording Information */}
          {call.recording && (
            <div style={{ 
              backgroundColor: '#F9FAFB', 
              padding: '16px', 
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>
                Recording
              </h3>
              <div style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}>
                <p style={{ margin: '4px 0' }}>
                  <strong>Recorded:</strong> {call.recording.isRecorded ? '🔴 Yes' : '❌ No'}
                </p>
                {call.recording.recordingUrl && (
                  <p style={{ margin: '4px 0' }}>
                    <strong>File:</strong> 
                    <a 
                      href={call.recording.recordingUrl} 
                      style={{ color: '#3B82F6', marginLeft: '8px' }}
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Download Recording
                    </a>
                  </p>
                )}
                {call.recording.fileSize && (
                  <p style={{ margin: '4px 0' }}>
                    <strong>Size:</strong> {Math.round(call.recording.fileSize / 1024 / 1024 * 100) / 100} MB
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>
            Tags
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {call.tags.map(tag => (
              <span
                key={tag}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add new tag..."
              style={{
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                flex: 1,
                maxWidth: '200px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <button
              onClick={handleAddTag}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Add Tag
            </button>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, color: '#374151', fontSize: '16px' }}>
              Notes
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                padding: '6px 12px',
                backgroundColor: isEditing ? '#6B7280' : '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {isEditing ? (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                placeholder="Add your notes about this call..."
              />
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveNotes}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Save Notes
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              minHeight: '60px',
              fontSize: '14px',
              color: '#374151',
              whiteSpace: 'pre-wrap'
            }}>
              {call.notes || 'No notes added yet.'}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {call.status === 'live' && (
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            paddingTop: '16px',
            borderTop: '1px solid #E5E7EB'
          }}>
            <button
              onClick={() => handleEndCall('resolved')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              End Call - Resolved
            </button>
            <button
              onClick={() => handleEndCall('escalated')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#F59E0B',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              End Call - Escalated
            </button>
            <button
              onClick={() => handleEndCall('callback-required')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              End Call - Callback Required
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallLogViewer;