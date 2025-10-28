class GoogleSheetsFetcher {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    }

    /**
     * Extract Google Sheets ID from various URL formats
     * @param {string} url - Google Sheets URL
     * @returns {string} - Sheets ID
     */
    extractSheetId(url) {
        // Handle different Google Sheets URL formats
        const patterns = [
            /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
            /\/d\/([a-zA-Z0-9-_]+)/,
            /id=([a-zA-Z0-9-_]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        throw new Error('Invalid Google Sheets URL format');
    }

    /**
     * Fetch data from Google Sheets
     * @param {string} sheetUrl - Google Sheets URL
     * @param {string} sheetName - Name of the sheet tab (optional)
     * @param {string} range - Range like "A1:Z100" (optional, defaults to all data)
     * @returns {Promise<Array>} - Array of rows
     */
    async fetchSheetData(sheetUrl, sheetName = null, range = null) {
        try {
            const sheetId = this.extractSheetId(sheetUrl);
            
            // Check cache first
            const cacheKey = `${sheetId}_${sheetName || 'default'}_${range || 'all'}`;
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('Returning cached data');
                return cached.data;
            }

            // Build the API URL - use the public CSV export method
            let apiUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

            console.log('Fetching from:', apiUrl);

            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                console.error('Response error:', response.status, response.statusText);
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }

            const csvText = await response.text();
            console.log('CSV response length:', csvText.length);
            console.log('CSV preview:', csvText.substring(0, 200));
            
            if (!csvText || csvText.trim() === '') {
                throw new Error('No data found in sheet');
            }

            // Parse CSV to array of arrays
            const rows = this.parseCSV(csvText);

            // Cache the result
            this.cache.set(cacheKey, {
                data: rows,
                timestamp: Date.now()
            });

            return rows;

        } catch (error) {
            console.error('Error fetching Google Sheets data:', error);
            throw error;
        }
    }

    /**
     * Fetch data and convert to objects with headers
     * @param {string} sheetUrl - Google Sheets URL
     * @param {string} sheetName - Name of the sheet tab (optional)
     * @param {string} range - Range like "A1:Z100" (optional)
     * @returns {Promise<Array>} - Array of objects with header keys
     */
    async fetchSheetAsObjects(sheetUrl, sheetName = null, range = null) {
        const rows = await this.fetchSheetData(sheetUrl, sheetName, range);
        
        if (rows.length === 0) {
            return [];
        }

        // First row as headers
        const headers = rows[0];
        const dataRows = rows.slice(1);

        // Convert to objects
        return dataRows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache info
     */
    getCacheInfo() {
        const info = {};
        for (const [key, value] of this.cache.entries()) {
            info[key] = {
                age: Date.now() - value.timestamp,
                size: value.data.length
            };
        }
        return info;
    }
}

// Example usage functions
class GoogleSheetsExample {
    constructor() {
        this.fetcher = new GoogleSheetsFetcher();
    }

    /**
     * Example: Display sheet data in a table
     */
    async displaySheetAsTable(sheetUrl, containerId, sheetName = null) {
        try {
            const data = await this.fetcher.fetchSheetAsObjects(sheetUrl, sheetName);
            const container = document.getElementById(containerId);
            
            if (!container) {
                throw new Error(`Container with ID '${containerId}' not found`);
            }

            if (data.length === 0) {
                container.innerHTML = '<p>No data found in the sheet.</p>';
                return;
            }

            // Get headers from first object
            const headers = Object.keys(data[0]);
            
            // Create table HTML
            let tableHtml = '<table class="sheets-table">';
            
            // Header row
            tableHtml += '<thead><tr>';
            headers.forEach(header => {
                tableHtml += `<th>${this.escapeHtml(header)}</th>`;
            });
            tableHtml += '</tr></thead>';
            
            // Data rows
            tableHtml += '<tbody>';
            data.forEach(row => {
                tableHtml += '<tr>';
                headers.forEach(header => {
                    tableHtml += `<td>${this.escapeHtml(row[header])}</td>`;
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';

            container.innerHTML = tableHtml;

        } catch (error) {
            console.error('Error displaying sheet data:', error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `<p class="error">Error loading data: ${error.message}</p>`;
            }
        }
    }

    /**
     * Example: Display sheet data as cards
     */
    async displaySheetAsCards(sheetUrl, containerId, sheetName = null) {
        try {
            const data = await this.fetcher.fetchSheetAsObjects(sheetUrl, sheetName);
            const container = document.getElementById(containerId);
            
            if (!container) {
                throw new Error(`Container with ID '${containerId}' not found`);
            }

            if (data.length === 0) {
                container.innerHTML = '<p>No data found in the sheet.</p>';
                return;
            }

            // Get headers from first object
            const headers = Object.keys(data[0]);
            
            // Create cards HTML
            let cardsHtml = '<div class="sheets-cards">';
            
            data.forEach(row => {
                cardsHtml += '<div class="sheet-card">';
                headers.forEach(header => {
                    cardsHtml += `
                        <div class="card-field">
                            <strong>${this.escapeHtml(header)}:</strong>
                            <span>${this.escapeHtml(row[header])}</span>
                        </div>
                    `;
                });
                cardsHtml += '</div>';
            });
            
            cardsHtml += '</div>';
            container.innerHTML = cardsHtml;

        } catch (error) {
            console.error('Error displaying sheet data:', error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `<p class="error">Error loading data: ${error.message}</p>`;
            }
        }
    }

    /**
     * Example: Get specific data by filtering
     */
    async getFilteredData(sheetUrl, filterFunction, sheetName = null) {
        try {
            const data = await this.fetcher.fetchSheetAsObjects(sheetUrl, sheetName);
            return data.filter(filterFunction);
        } catch (error) {
            console.error('Error filtering sheet data:', error);
            throw error;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Parse CSV text to array of arrays
     * @param {string} csvText - CSV text content
     * @returns {Array} - Array of rows (each row is an array of cells)
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const rows = [];
        
        for (const line of lines) {
            if (line.trim() === '') continue;
            
            const row = this.parseCSVLine(line);
            rows.push(row);
        }
        
        return rows;
    }

    /**
     * Parse a single CSV line handling quoted fields
     * @param {string} line - CSV line
     * @returns {Array} - Array of field values
     */
    parseCSVLine(line) {
        const fields = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    currentField += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                fields.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        
        // Add the last field
        fields.push(currentField);
        
        return fields;
    }

    /**
     * Get sheet GID for a given sheet name
     * This is a simplified approach - in practice, you might need to fetch sheet metadata
     * @param {string} sheetName - Name of the sheet
     * @returns {string} - Sheet GID (defaults to 0 for first sheet)
     */
    getSheetGid(sheetName) {
        // For now, return 0 (first sheet)
        // In a more robust implementation, you'd fetch the sheet metadata
        // to get the actual GID for each sheet name
        return '0';
    }
}

// Make classes available globally
window.GoogleSheetsFetcher = GoogleSheetsFetcher;
window.GoogleSheetsExample = GoogleSheetsExample;
