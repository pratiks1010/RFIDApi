import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * File watcher hook for C:\loyalstring\MyScans folder
 * Watches Scandate file (contains EPC array) and command file
 */
const useMyScansFileWatcher = (options = {}) => {
  const {
    intervalMs = 2000,
    enabled = false,
    onEpcsReceived,
    onError
  } = options;

  const [status, setStatus] = useState('idle'); // 'idle' | 'watching' | 'paused' | 'error'
  const [epcArray, setEpcArray] = useState([]);
  const [scanDate, setScanDate] = useState(null);
  const [error, setError] = useState(null);
  const [lastModified, setLastModified] = useState(null);
  
  const intervalRef = useRef(null);
  const filePathRef = useRef({
    scanDataFile: 'C:\\loyalstring\\MyScans\\ScanData.json',
    commandFile: 'C:\\loyalstring\\MyScans\\command'
  });
  const sentEpcsRef = useRef(new Set());
  const isPollingRef = useRef(false);

  // Read ScanData.json file and extract EPC array
  const readScanDataFile = useCallback(async () => {
    try {
      // Try multiple methods to read the file
      
      // Method 1: Electron environment
      if (typeof window !== 'undefined' && window.electron && window.electron.readFile) {
        try {
          const content = await window.electron.readFile(filePathRef.current.scanDataFile);
          return parseScanDataContent(content);
        } catch (err) {
          console.warn('Electron file read failed:', err);
        }
      }
      
      // Method 2: API endpoint (if backend service watches the files)
      try {
        const response = await fetch('https://rrgold.loyalstring.co.in/api/FileWatcher/GetScanData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            filePath: filePathRef.current.scanDataFile
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const content = data.content || data.data || data;
          return parseScanDataContent(content);
        }
      } catch (err) {
        console.warn('API file read failed:', err);
      }
      
      // Method 3: File System Access API (limited browser support)
      if (typeof window !== 'undefined' && window.showOpenFilePicker) {
        // This requires user interaction, so not suitable for auto-watching
        // But can be used for manual file selection
        console.warn('File System Access API requires user interaction');
      }
      
      // Fallback: return empty
      return { epcs: [], date: null };
    } catch (err) {
      console.error('Error reading ScanData.json file:', err);
      if (onError) onError(err);
      return { epcs: [], date: null };
    }
  }, [onError]);

  // Parse ScanData.json file content (expects JSON array of EPC strings)
  const parseScanDataContent = useCallback((content) => {
    try {
      if (!content || content.trim() === '') {
        return { epcs: [], date: null };
      }

      // Parse JSON content - expects array of EPC strings
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseErr) {
        console.error('Failed to parse JSON:', parseErr);
        return { epcs: [], date: null };
      }

      let epcs = [];
      let date = null;

      // Expected format: ["EPC1", "EPC2", "EPC3", ...]
      if (Array.isArray(parsed)) {
        // Filter out empty strings and validate EPCs
        epcs = parsed
          .filter(item => {
            if (typeof item === 'string' && item.trim().length > 0) {
              // Check if it's a date string (optional)
              const dateMatch = item.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/);
              if (dateMatch) {
                date = dateMatch[0];
                return false; // Don't include date in EPCs
              }
              return true; // Valid EPC string
            }
            return false;
          })
          .map(epc => String(epc).trim());
      } else if (typeof parsed === 'object' && parsed !== null) {
        // If it's an object, look for epc/epcs array
        epcs = parsed.epcs || parsed.epc || parsed.EPCs || parsed.EPC || [];
        date = parsed.date || parsed.Date || parsed.scanDate || parsed.ScanDate || null;
        
        if (!Array.isArray(epcs)) {
          epcs = [];
        } else {
          epcs = epcs
            .filter(item => typeof item === 'string' && item.trim().length > 0)
            .map(epc => String(epc).trim());
        }
      } else {
        console.warn('Unexpected file format. Expected JSON array.');
        return { epcs: [], date: null };
      }

      // Clean and validate EPCs (remove empty strings)
      epcs = epcs.filter(epc => epc.length > 0);

      return { epcs, date };
    } catch (err) {
      console.error('Error parsing Scandate content:', err);
      return { epcs: [], date: null };
    }
  }, []);

  // Read command file
  const readCommandFile = useCallback(async () => {
    try {
      // Method 1: Electron
      if (typeof window !== 'undefined' && window.electron && window.electron.readFile) {
        try {
          const content = await window.electron.readFile(filePathRef.current.commandFile);
          return content?.trim().toLowerCase() || 'stop';
        } catch (err) {
          console.warn('Electron command read failed:', err);
        }
      }
      
      // Method 2: API endpoint
      try {
        const response = await fetch('https://rrgold.loyalstring.co.in/api/FileWatcher/GetCommand', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            filePath: filePathRef.current.commandFile
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return (data.command || data.content || 'stop').trim().toLowerCase();
        }
      } catch (err) {
        console.warn('API command read failed:', err);
      }
      
      return 'stop';
    } catch (err) {
      console.error('Error reading command file:', err);
      return 'stop';
    }
  }, []);

  // Write command to file
  const writeCommandFile = useCallback(async (command) => {
    try {
      // Method 1: Electron
      if (typeof window !== 'undefined' && window.electron && window.electron.writeFile) {
        try {
          await window.electron.writeFile(filePathRef.current.commandFile, command);
          return true;
        } catch (err) {
          console.warn('Electron command write failed:', err);
        }
      }
      
      // Method 2: API endpoint
      try {
        const response = await fetch('https://rrgold.loyalstring.co.in/api/FileWatcher/WriteCommand', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            filePath: filePathRef.current.commandFile,
            command: command
          })
        });
        
        if (response.ok) {
          return true;
        }
      } catch (err) {
        console.warn('API command write failed:', err);
      }
      
      return false;
    } catch (err) {
      console.error('Error writing command file:', err);
      return false;
    }
  }, []);

  // Check file modification time
  const checkFileModified = useCallback(async () => {
    try {
      // Method 1: Electron
      if (typeof window !== 'undefined' && window.electron && window.electron.getFileStats) {
        try {
          const stats = await window.electron.getFileStats(filePathRef.current.scanDataFile);
          return stats?.mtime || null;
        } catch (err) {
          console.warn('Electron stats read failed:', err);
        }
      }
      
      // Method 2: API endpoint
      try {
        const response = await fetch('https://rrgold.loyalstring.co.in/api/FileWatcher/GetFileStats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            filePath: filePathRef.current.scanDataFile
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.mtime || data.lastModified || null;
        }
      } catch (err) {
        console.warn('API stats read failed:', err);
      }
      
      // Fallback: use current timestamp to always trigger read
      return Date.now().toString();
    } catch (err) {
      return null;
    }
  }, []);

  // Start watching
  const start = useCallback(() => {
    if (status === 'watching') return;
    
    setStatus('watching');
    setError(null);
    
    // Start polling
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(async () => {
      if (isPollingRef.current) return;
      
      try {
        // Check command file
        const command = await readCommandFile();
        
        if (command === 'stop') {
          stop();
          return;
        }
        
        if (command !== 'start') {
          return;
        }
        
        // Check if file was modified
        const modified = await checkFileModified();
        if (modified && modified === lastModified) {
          return; // No changes
        }
        
        isPollingRef.current = true;
        
        // Read ScanData.json file
        const { epcs, date } = await readScanDataFile();
        
        if (epcs.length > 0) {
          // Filter out already sent EPCs
          const newEpcs = epcs.filter(epc => !sentEpcsRef.current.has(epc));
          
          if (newEpcs.length > 0) {
            setEpcArray(newEpcs);
            setScanDate(date);
            setLastModified(modified);
            
            // Mark as sent
            newEpcs.forEach(epc => sentEpcsRef.current.add(epc));
            
            // Callback
            if (onEpcsReceived) {
              onEpcsReceived(newEpcs, date);
            }
          }
        }
        
        isPollingRef.current = false;
      } catch (err) {
        console.error('Error in file watcher:', err);
        setError(err.message);
        isPollingRef.current = false;
        if (onError) onError(err);
      }
    }, intervalMs);
  }, [status, lastModified, intervalMs, readScanDataFile, readCommandFile, checkFileModified, onEpcsReceived, onError]);

  // Stop watching
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('idle');
    isPollingRef.current = false;
  }, []);

  // Send command
  const sendCommand = useCallback(async (command) => {
    try {
      await writeCommandFile(command);
      if (command === 'start') {
        start();
      } else if (command === 'stop') {
        stop();
      } else if (command === 'clear') {
        // Clear sent EPCs tracking
        sentEpcsRef.current = new Set();
        setEpcArray([]);
        setScanDate(null);
        setLastModified(null);
      }
      return true;
    } catch (err) {
      console.error('Error sending command:', err);
      if (onError) onError(err);
      return false;
    }
  }, [start, stop, writeCommandFile, onError]);

  // Effect to start/stop based on enabled flag
  useEffect(() => {
    if (enabled && status !== 'watching') {
      start();
    } else if (!enabled && status === 'watching') {
      stop();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, status, start, stop]);

  return {
    status,
    epcArray,
    scanDate,
    error,
    start,
    stop,
    sendCommand,
    lastModified
  };
};

export default useMyScansFileWatcher;

