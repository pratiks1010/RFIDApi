import apkData from '../data/apkVersions.json';

class APKService {
  constructor() {
    this.apkVersions = apkData.apkVersions;
    this.appInfo = apkData.appInfo;
    this.systemRequirements = apkData.systemRequirements;
  }

  // Get all APK versions
  getAllVersions() {
    return this.apkVersions;
  }

  // Get latest version
  getLatestVersion() {
    return this.apkVersions.find(version => version.isLatest) || this.apkVersions[0];
  }

  // Get version by ID
  getVersionById(versionId) {
    return this.apkVersions.find(version => version.id === versionId);
  }

  // Get app information
  getAppInfo() {
    return this.appInfo;
  }

  // Get system requirements
  getSystemRequirements() {
    return this.systemRequirements;
  }

  // Convert Google Drive sharing URL to direct download URL
  convertDriveUrl(shareUrl) {
    // Extract file ID from various Google Drive URL formats
    let fileId = null;
    
    if (shareUrl.includes('/file/d/')) {
      fileId = shareUrl.split('/file/d/')[1].split('/')[0];
    } else if (shareUrl.includes('id=')) {
      fileId = shareUrl.split('id=')[1].split('&')[0];
    } else if (shareUrl.includes('/d/')) {
      fileId = shareUrl.split('/d/')[1].split('/')[0];
    }
    
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    
    return shareUrl; // Return original if no conversion needed
  }

  // Download APK file
  async downloadAPK(version, onProgress = null) {
    try {
      const downloadUrl = version.downloadUrl || this.convertDriveUrl(version.downloadUrl);
      
      // Create a temporary anchor element for download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = version.fileName;
      link.target = '_blank';
      
      // Add to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // For Google Drive files, we might need to handle differently
      if (downloadUrl.includes('drive.google.com')) {
        // Open in new tab for Google Drive files as they might need user confirmation
        window.open(downloadUrl, '_blank');
      }

      return {
        success: true,
        message: 'Download started successfully',
        fileName: version.fileName,
        size: version.size
      };
    } catch (error) {
      console.error('Download error:', error);
      return {
        success: false,
        message: 'Download failed. Please try again.',
        error: error.message
      };
    }
  }

  // Alternative download method using fetch (for progress tracking)
  async downloadWithProgress(version, onProgress = null) {
    try {
      const downloadUrl = version.downloadUrl;
      
      if (onProgress) {
        onProgress({ phase: 'starting', progress: 0 });
      }

      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);
      let loaded = 0;

      const reader = response.body.getReader();
      const stream = new ReadableStream({
        start(controller) {
          function pump() {
            return reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              
              loaded += value.byteLength;
              if (onProgress && total) {
                const progress = Math.round((loaded / total) * 100);
                onProgress({ phase: 'downloading', progress, loaded, total });
              }
              
              controller.enqueue(value);
              return pump();
            });
          }
          return pump();
        }
      });

      const newResponse = new Response(stream);
      const blob = await newResponse.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = version.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (onProgress) {
        onProgress({ phase: 'completed', progress: 100 });
      }

      return {
        success: true,
        message: 'Download completed successfully',
        fileName: version.fileName,
        size: version.size
      };
    } catch (error) {
      console.error('Download with progress error:', error);
      return {
        success: false,
        message: 'Download failed. Please try again.',
        error: error.message
      };
    }
  }

  // Get download statistics
  getDownloadStats() {
    const totalVersions = this.apkVersions.length;
    const latestVersion = this.getLatestVersion();
    const totalSize = this.apkVersions.reduce((sum, version) => sum + version.sizeBytes, 0);
    
    return {
      totalVersions,
      latestVersion: latestVersion?.version,
      totalSize: this.formatBytes(totalSize),
      lastUpdated: this.appInfo.lastUpdated
    };
  }

  // Format bytes to human readable format
  formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Validate APK version data
  validateVersion(version) {
    const required = ['id', 'version', 'downloadUrl', 'fileName', 'size'];
    return required.every(field => version[field]);
  }

  // Update version data (for admin purposes)
  updateVersion(versionId, updateData) {
    const versionIndex = this.apkVersions.findIndex(v => v.id === versionId);
    if (versionIndex !== -1) {
      this.apkVersions[versionIndex] = { ...this.apkVersions[versionIndex], ...updateData };
      return true;
    }
    return false;
  }

  // Add new version
  addVersion(versionData) {
    if (this.validateVersion(versionData)) {
      // If this is the latest version, update other versions
      if (versionData.isLatest) {
        this.apkVersions.forEach(version => {
          version.isLatest = false;
        });
      }
      
      this.apkVersions.unshift(versionData);
      return true;
    }
    return false;
  }
}

// Create and export singleton instance
const apkService = new APKService();
export default apkService; 