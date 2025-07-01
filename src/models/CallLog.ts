/**
 * Interface representing a call log entry
 */
export interface CallLog {
  /**
   * Unique identifier for the call
   */
  id: string;

  /**
   * ID of the supervisor who monitored the call
   */
  supervisorId: string;

  /**
   * ID of the agent on the call
   */
  agentId: string;

  /**
   * Customer information
   */
  customer: {
    id?: string;
    name?: string;
    phoneNumber: string;
  };

  /**
   * Call start timestamp
   */
  startTime: Date;

  /**
   * Call end timestamp (null if call is still active)
   */
  endTime: Date | null;

  /**
   * Duration of the call in seconds
   */
  duration: number;

  /**
   * Current status of the call
   */
  status: 'live' | 'ended' | 'on-hold' | 'transferred';

  /**
   * Whether the call was monitored by a supervisor
   */
  isMonitored: boolean;

  /**
   * Call quality metrics
   */
  quality: {
    /**
     * Audio quality score (1-5)
     */
    audioQuality: number;
    
    /**
     * Connection stability score (1-5)
     */
    connectionStability: number;
  };

  /**
   * Call recording information
   */
  recording?: {
    /**
     * Whether the call was recorded
     */
    isRecorded: boolean;
    
    /**
     * URL to the recording file
     */
    recordingUrl?: string;
    
    /**
     * Recording file size in bytes
     */
    fileSize?: number;
  };

  /**
   * Call notes added by supervisor
   */
  notes?: string;

  /**
   * Tags for categorizing the call
   */
  tags: string[];

  /**
   * Call metadata
   */
  metadata: {
    /**
     * Call direction (inbound/outbound)
     */
    direction: 'inbound' | 'outbound';
    
    /**
     * Department or team handling the call
     */
    department: string;
    
    /**
     * Call priority level
     */
    priority: 'low' | 'medium' | 'high' | 'urgent';
    
    /**
     * Call outcome or resolution
     */
    outcome?: 'resolved' | 'escalated' | 'callback-required' | 'no-resolution';
  };
}

/**
 * Interface for call log search filters
 */
export interface CallLogFilters {
  supervisorId?: string;
  agentId?: string;
  status?: CallLog['status'];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  department?: string;
  priority?: CallLog['metadata']['priority'];
  isMonitored?: boolean;
  tags?: string[];
}

/**
 * Interface for call log search results
 */
export interface CallLogSearchResult {
  logs: CallLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}