'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Session {
  id: number;
  startTime: string;
  endTime?: string;
  creditsConsumed: number;
  isActive: boolean;
  createdAt: string;
}


function Dashboard() {
  const { user, token, logout, updateCredits } = useAuth();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  
  // Enhanced features state
  const [sessionHistory, setSessionHistory] = useState<Session[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Prevent re-renders with refs
  const fetchingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stable fetch functions using useCallback to prevent re-renders
  const fetchSessionStatus = useCallback(async () => {
    if (!token || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const response = await fetch('/api/session/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
      }
    } catch (error) {
      console.error('Error fetching session status:', error);
    } finally {
      fetchingRef.current = false;
    }
  }, [token]);

  const fetchSessionHistory = useCallback(async () => {
    if (!token) return;
    
    // Use ref to prevent concurrent requests
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setHistoryLoading(true);
    
    try {
      const response = await fetch('/api/session/history', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSessionHistory(data.sessions);
      }
    } catch (error) {
      console.error('Error fetching session history:', error);
    } finally {
      setHistoryLoading(false);
      fetchingRef.current = false;
    }
  }, [token]);


  // WebSocket setup using Socket.IO
  useEffect(() => {
    if (!token) return;

    let socket: ReturnType<typeof import('socket.io-client').io> | null = null;

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 20000,
          transports: ['websocket', 'polling'], // Prefer websocket, fallback to polling
          upgrade: true,
          rememberUpgrade: true,
        });
        
        socket.on('connect', () => {
          console.log('Socket.IO connected');
          if (socket) {
          socket.emit('authenticate', token);
        }
        });

        socket.on('authenticated', (data: { success: boolean; error?: string }) => {
          if (data.success) {
            console.log('Socket.IO authentication successful');
          } else {
            console.error('Socket.IO authentication failed:', data.error);
          }
        });

        socket.on('credit_update', (data: { credits: number }) => {
          console.log('Received credit update:', data.credits);
          updateCredits(data.credits);
        });

        socket.on('session_end', () => {
          console.log('Received session_end event');
          setActiveSession(null);
          setSessionDuration(0);
          setLoading(false); // Ensure loading state is cleared
          setError('Session ended - insufficient credits');
          // Refresh session status and history
          setTimeout(() => {
            fetchSessionStatus();
            fetchSessionHistory();
          }, 1000);
        });

        socket.on('disconnect', (reason: string) => {
          console.log('Socket.IO disconnected:', reason);
        });

        socket.on('connect_error', (error: Error) => {
          console.error('Socket.IO connection error:', error);
        });

      } catch (error) {
        console.error('Socket.IO setup error:', error);
      }
    };

    connectSocket();

    // Cleanup function
    return () => {
      if (socket) {
        console.log('Cleaning up socket connection');
        socket.disconnect();
        socket = null;
      }
    };
  }, [token, updateCredits, fetchSessionHistory, fetchSessionStatus]);

  // Update session duration every second
  useEffect(() => {
    if (activeSession) {
      intervalRef.current = setInterval(() => {
        const startTime = new Date(activeSession.startTime).getTime();
        const now = new Date().getTime();
        setSessionDuration(Math.floor((now - startTime) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeSession]);

  // Fetch data only when token is available - prevent infinite re-renders
  useEffect(() => {
    if (token && !fetchingRef.current) {
      fetchSessionStatus();
    }
  }, [token, fetchSessionStatus]);

  // Fetch history only when history tab is clicked
  useEffect(() => {
    if (token && activeTab === 'history') {
      fetchSessionHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const startSession = async () => {
    if (loading) return; // Prevent multiple clicks
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setActiveSession(data.session);
        // Don't call fetchSessionStatus here to avoid redundant API calls
      } else {
        setError(data.error || 'Failed to start session');
      }
    } catch (err) {
      console.error('Start session error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async () => {
    if (loading) return; // Prevent multiple clicks
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/session/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setActiveSession(null);
        setSessionDuration(0);
        updateCredits(data.userCredits);
        // Delay history refresh to avoid immediate re-render
        setTimeout(() => {
          fetchSessionHistory();
        }, 1000);
      } else {
        setError(data.error || 'Failed to stop session');
      }
    } catch (err) {
      console.error('Stop session error:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if session should be considered active (not ended due to insufficient credits)
  const isSessionActive = activeSession && !error.includes('insufficient credits');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Credit Balance */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
              <h2 className="text-lg font-semibold mb-2">Credit Balance</h2>
              <p className="text-3xl font-bold text-white">
                {user?.credits || 0} credits
              </p>
              <p className="text-blue-100 mt-2">
                {Math.floor((user?.credits || 0) / 10)} minutes remaining
              </p>
            </div>

            {/* Session Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Session Status</h3>
                {isSessionActive ? (
                  <div className="space-y-2">
                    <p className="text-green-600 font-medium">✓ Active Session</p>
                    <p className="text-sm text-gray-600">
                      Started: {new Date(activeSession.startTime).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Duration: {formatTime(sessionDuration)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Credits Used: {activeSession.creditsConsumed}
                    </p>
                  </div>
                ) : activeSession && error.includes('insufficient credits') ? (
                  <div className="space-y-2">
                    <p className="text-red-600 font-medium">✗ Session Ended</p>
                    <p className="text-sm text-red-600">
                      Reason: Insufficient credits
                    </p>
                    <p className="text-sm text-gray-600">
                      Final Duration: {formatTime(sessionDuration)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Credits Used: {activeSession.creditsConsumed}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No active session</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {!isSessionActive ? (
                    <button
                      onClick={startSession}
                      disabled={loading || (user?.credits || 0) < 1}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Starting...' : 'Start Session'}
                    </button>
                  ) : (
                    <button
                      onClick={stopSession}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                    >
                      {loading ? 'Stopping...' : 'Stop Session'}
                    </button>
                  )}
                  
                  {(user?.credits || 0) < 1 && !activeSession && (
                    <p className="text-sm text-red-600 text-center">
                      Insufficient credits to start session
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Session History</h2>
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading history...</p>
              </div>
            ) : sessionHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits Used</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessionHistory.map((session) => {
                      const startTime = new Date(session.startTime);
                      const endTime = session.endTime ? new Date(session.endTime) : null;
                      const duration = endTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : 0;
                      
                      return (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{session.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {startTime.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {endTime ? endTime.toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {endTime ? formatTime(duration) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {session.creditsConsumed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              session.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {session.isActive ? 'Active' : 'Completed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No session history available</p>
              </div>
            )}
          </div>
        );


      default:
        return null;
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="mt-4 sm:mt-0 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Session History
              </button>
            </nav>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
