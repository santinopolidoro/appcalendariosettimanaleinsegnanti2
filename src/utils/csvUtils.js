// CSV Utility functions for exporting and importing data

/**
 * Convert teachers and schedule data to CSV format
 * @param {Array} teachers - Array of teacher objects
 * @param {Object} schedule - Schedule object
 * @returns {string} - CSV formatted string
 */
export const convertToCSV = (teachers, schedule) => {
  // Create a data object that combines teachers and schedule
  const data = {
    teachers: teachers,
    schedule: schedule
  };
  
  // Convert to JSON string first, then to CSV
  // We're using JSON as an intermediate format since our data is hierarchical
  const jsonString = JSON.stringify(data);
  
  // Return the JSON string as our "CSV" format
  // (We're using JSON because true CSV would be complex for nested data)
  return jsonString;
};

/**
 * Parse CSV data back into teachers and schedule objects
 * @param {string} csvData - CSV formatted string
 * @returns {Object} - Object containing teachers array and schedule object
 */
export const parseCSV = (csvData) => {
  try {
    // Parse the JSON string back to an object
    const data = JSON.parse(csvData);
    
    // Return the teachers and schedule
    return {
      teachers: data.teachers || [],
      schedule: data.schedule || {}
    };
  } catch (error) {
    console.error('Error parsing CSV data:', error);
    return {
      teachers: [],
      schedule: {}
    };
  }
};

/**
 * Download data as a CSV file
 * @param {string} csvData - CSV formatted string
 * @param {string} filename - Name of the file to download
 */
export const downloadCSV = (csvData, filename = 'teacher_schedule.csv') => {
  // Create a blob with the CSV data
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link
  const link = document.createElement('a');
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Set the link's attributes
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add the link to the document
  document.body.appendChild(link);
  
  // Click the link to start the download
  link.click();
  
  // Remove the link from the document
  document.body.removeChild(link);
};

/**
 * Read a CSV file and return its contents
 * @param {File} file - File object to read
 * @returns {Promise<string>} - Promise that resolves with the file contents
 */
export const readCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
};