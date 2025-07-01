import { CallLog, CallLogFilters, CallLogSearchResult } from '../models/CallLog';

/**
 * Service class for managing call logs
 */
export class CallLogService {
  private callLogs: Map<string, CallLog> = new Map();

  constructor() {
    // Initialize with some sample data for demonstration
    this.initializeSampleData();
  }

  /**
   * Create a new call log entry
   * @param callData Partial call log data
   * @returns The created call log object
   */
  public createCallLog(callData: Omit<CallLog, 'id' | 'duration'>): CallLog {
    const callLog: CallLog = {
      id: this.generateCallLogId(),
      duration: callData.endTime 
        ? Math.floor((callData.endTime.getTime() - callData.startTime.getTime()) / 1000)
        : 0,
      ...callData
    };

    this.callLogs.set(callLog.id, callLog);
    return callLog;
  }

  /**
   * Retrieve a call log by its ID
   * @param callId The ID of the call log to retrieve
   * @returns The call log object if found, null otherwise
   */
  public getCallLog(callId: string): CallLog | null {
    return this.callLogs.get(callId) || null;
  }

  /**
   * Get all call logs for a specific supervisor with one-click access
   * @param supervisorId The ID of the supervisor
   * @returns Array of call logs monitored by the supervisor
   */
  public getSupervisorCallLogs(supervisorId: string): CallLog[] {
    return Array.from(this.callLogs.values())
      .filter(log => log.supervisorId === supervisorId && log.isMonitored)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get live calls currently being monitored by a supervisor
   * @param supervisorId The ID of the supervisor
   * @returns Array of live call logs
   */
  public getLiveMonitoredCalls(supervisorId: string): CallLog[] {
    return Array.from(this.callLogs.values())
      .filter(log => 
        log.supervisorId === supervisorId && 
        log.isMonitored && 
        log.status === 'live'
      )
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Search call logs with filters and pagination
   * @param filters Search filters
   * @param page Page number (1-based)
   * @param pageSize Number of results per page
   * @returns Paginated search results
   */
  public searchCallLogs(
    filters: CallLogFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): CallLogSearchResult {
    let filteredLogs = Array.from(this.callLogs.values());

    // Apply filters
    if (filters.supervisorId) {
      filteredLogs = filteredLogs.filter(log => log.supervisorId === filters.supervisorId);
    }

    if (filters.agentId) {
      filteredLogs = filteredLogs.filter(log => log.agentId === filters.agentId);
    }

    if (filters.status) {
      filteredLogs = filteredLogs.filter(log => log.status === filters.status);
    }

    if (filters.dateRange) {
      filteredLogs = filteredLogs.filter(log => 
        log.startTime >= filters.dateRange!.startDate &&
        log.startTime <= filters.dateRange!.endDate
      );
    }

    if (filters.department) {
      filteredLogs = filteredLogs.filter(log => log.metadata.department === filters.department);
    }

    if (filters.priority) {
      filteredLogs = filteredLogs.filter(log => log.metadata.priority === filters.priority);
    }

    if (filters.isMonitored !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.isMonitored === filters.isMonitored);
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        filters.tags!.some(tag => log.tags.includes(tag))
      );
    }

    // Sort by start time (most recent first)
    filteredLogs.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Apply pagination
    const totalCount = filteredLogs.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    return {
      logs: paginatedLogs,
      totalCount,
      page,
      pageSize,
      hasMore: endIndex < totalCount
    };
  }

  /**
   * Update call log notes
   * @param callId The ID of the call log to update
   * @param notes New notes for the call
   * @returns The updated call log if found, null otherwise
   */
  public updateCallNotes(callId: string, notes: string): CallLog | null {
    const callLog = this.callLogs.get(callId);
    if (!callLog) return null;

    callLog.notes = notes;
    this.callLogs.set(callId, callLog);
    return callLog;
  }

  /**
   * Add tags to a call log
   * @param callId The ID of the call log
   * @param tags Array of tags to add
   * @returns The updated call log if found, null otherwise
   */
  public addCallTags(callId: string, tags: string[]): CallLog | null {
    const callLog = this.callLogs.get(callId);
    if (!callLog) return null;

    // Add new tags, avoiding duplicates
    const newTags = tags.filter(tag => !callLog.tags.includes(tag));
    callLog.tags.push(...newTags);
    
    this.callLogs.set(callId, callLog);
    return callLog;
  }

  /**
   * End a live call and update its status
   * @param callId The ID of the call to end
   * @param outcome The call outcome
   * @returns The updated call log if found, null otherwise
   */
  public endCall(callId: string, outcome?: CallLog['metadata']['outcome']): CallLog | null {
    const callLog = this.callLogs.get(callId);
    if (!callLog) return null;

    const endTime = new Date();
    callLog.endTime = endTime;
    callLog.status = 'ended';
    callLog.duration = Math.floor((endTime.getTime() - callLog.startTime.getTime()) / 1000);
    
    if (outcome) {
      callLog.metadata.outcome = outcome;
    }

    this.callLogs.set(callId, callLog);
    return callLog;
  }

  /**
   * Get call statistics for a supervisor
   * @param supervisorId The ID of the supervisor
   * @returns Call statistics object
   */
  public getSupervisorStats(supervisorId: string) {
    const supervisorLogs = this.getSupervisorCallLogs(supervisorId);
    const liveCalls = supervisorLogs.filter(log => log.status === 'live').length;
    const totalMonitored = supervisorLogs.length;
    const averageDuration = supervisorLogs.length > 0 
      ? supervisorLogs.reduce((sum, log) => sum + log.duration, 0) / supervisorLogs.length
      : 0;

    return {
      liveCalls,
      totalMonitored,
      averageDuration: Math.round(averageDuration),
      callsToday: supervisorLogs.filter(log => 
        log.startTime.toDateString() === new Date().toDateString()
      ).length
    };
  }

  /**
   * Generate a unique call log ID
   * @returns A unique string ID
   */
  private generateCallLogId(): string {
    return 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Initialize sample data for demonstration
   */
  private initializeSampleData(): void {
    const sampleCalls: Omit<CallLog, 'id' | 'duration'>[] = [
      {
        supervisorId: 'supervisor_001',
        agentId: 'agent_001',
        customer: {
          id: 'customer_001',
          name: 'John Smith',
          phoneNumber: '+1-555-0123'
        },
        startTime: new Date(Date.now() - 300000), // 5 minutes ago
        endTime: null,
        status: 'live',
        isMonitored: true,
        quality: {
          audioQuality: 4,
          connectionStability: 5
        },
        recording: {
          isRecorded: true
        },
        tags: ['customer-service', 'billing-inquiry'],
        metadata: {
          direction: 'inbound',
          department: 'Customer Service',
          priority: 'medium'
        }
      },
      {
        supervisorId: 'supervisor_001',
        agentId: 'agent_002',
        customer: {
          id: 'customer_002',
          name: 'Jane Doe',
          phoneNumber: '+1-555-0456'
        },
        startTime: new Date(Date.now() - 1800000), // 30 minutes ago
        endTime: new Date(Date.now() - 600000), // ended 10 minutes ago
        status: 'ended',
        isMonitored: true,
        quality: {
          audioQuality: 5,
          connectionStability: 4
        },
        recording: {
          isRecorded: true,
          recordingUrl: '/recordings/call_12345.mp3',
          fileSize: 2048000
        },
        notes: 'Customer was satisfied with the resolution. Follow-up scheduled.',
        tags: ['technical-support', 'resolved'],
        metadata: {
          direction: 'inbound',
          department: 'Technical Support',
          priority: 'high',
          outcome: 'resolved'
        }
      },
      {
        supervisorId: 'supervisor_001',
        agentId: 'agent_003',
        customer: {
          phoneNumber: '+1-555-0789'
        },
        startTime: new Date(Date.now() - 7200000), // 2 hours ago
        endTime: new Date(Date.now() - 6600000), // ended 1h 50m ago
        status: 'ended',
        isMonitored: true,
        quality: {
          audioQuality: 3,
          connectionStability: 3
        },
        recording: {
          isRecorded: false
        },
        notes: 'Call quality was poor. Customer requested callback.',
        tags: ['sales', 'callback-required'],
        metadata: {
          direction: 'outbound',
          department: 'Sales',
          priority: 'low',
          outcome: 'callback-required'
        }
      }
    ];

    sampleCalls.forEach(callData => {
      this.createCallLog(callData);
    });
  }
}