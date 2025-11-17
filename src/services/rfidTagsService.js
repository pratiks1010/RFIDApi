import { rfidService } from './rfidService';

class RFIDTagsService {
  constructor() {
    this.storageKey = 'rfid_tags_count';
    this.promptShownKey = 'rfid_upload_prompt_shown';
  }

  // Get RFID tags count from API or local storage
  async getRFIDTagsCount(userId = null) {
    try {
      // Try to get from API first
      const response = await rfidService.getRFIDTags();
      if (response && response.data && Array.isArray(response.data)) {
        const count = response.data.length;
        // Store in localStorage for quick access
        localStorage.setItem(this.storageKey, count.toString());
        return count;
      }
    } catch (error) {
      console.log('API call failed, checking localStorage:', error);
    }

    // Fallback to localStorage
    const storedCount = localStorage.getItem(this.storageKey);
    return storedCount ? parseInt(storedCount, 10) : 0;
  }

  // Check if user has zero RFID tags
  async hasZeroTags(userId = null) {
    const count = await this.getRFIDTagsCount(userId);
    return count === 0;
  }

  // Check if upload prompt should be shown
  shouldShowUploadPrompt(userId = null) {
    const sessionKey = `${this.promptShownKey}_${userId || 'default'}_${this.getCurrentSession()}`;
    return !sessionStorage.getItem(sessionKey);
  }

  // Mark upload prompt as shown for this session
  markPromptAsShown(userId = null) {
    const sessionKey = `${this.promptShownKey}_${userId || 'default'}_${this.getCurrentSession()}`;
    sessionStorage.setItem(sessionKey, 'true');
  }

  // Get current session identifier (date-based)
  getCurrentSession() {
    return new Date().toDateString();
  }

  // Check if prompt should be displayed on login
  async shouldDisplayPromptOnLogin(userId = null) {
    const hasZero = await this.hasZeroTags(userId);
    const shouldShow = this.shouldShowUploadPrompt(userId);
    
    return hasZero && shouldShow;
  }

  // Update RFID tags count (call after successful upload)
  updateTagsCount(newCount) {
    localStorage.setItem(this.storageKey, newCount.toString());
  }

  // Clear all stored data (for testing or logout)
  clearStoredData() {
    localStorage.removeItem(this.storageKey);
    // Clear all session storage items related to prompts
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(this.promptShownKey)) {
        sessionStorage.removeItem(key);
      }
    });
  }

  // Get user's inventory summary for display
  async getInventorySummary(userId = null) {
    try {
      const tagsCount = await this.getRFIDTagsCount(userId);
      
      // You can extend this to get more detailed stats
      return {
        totalTags: tagsCount,
        itemsTracked: tagsCount, // Assuming 1:1 mapping for now
        lastUpdated: localStorage.getItem('rfid_last_update') || null,
        isEmpty: tagsCount === 0
      };
    } catch (error) {
      console.error('Error getting inventory summary:', error);
      return {
        totalTags: 0,
        itemsTracked: 0,
        lastUpdated: null,
        isEmpty: true
      };
    }
  }

  // For testing purposes - simulate different tag counts
  setTestTagsCount(count) {
    localStorage.setItem(this.storageKey, count.toString());
  }
}

// Create and export singleton instance
const rfidTagsService = new RFIDTagsService();
export default rfidTagsService; 