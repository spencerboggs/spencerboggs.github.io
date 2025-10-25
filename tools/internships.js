// Internship Sorter JavaScript
// Handles data fetching, filtering, and application tracking

class InternshipSorter {
    constructor() {
        this.internships = [];
        this.appliedJobs = this.loadAppliedJobs();
        this.filters = {
            company: '',
            role: '',
            location: ''
        };
        this.currentData = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupStickyHeader();
        this.loadInternships();
    }

    setupEventListeners() {
        // Filter buttons
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());
        document.getElementById('refreshData').addEventListener('click', () => this.refreshData());
        document.getElementById('viewApplied').addEventListener('click', () => this.viewAppliedJobs());

        // Filter inputs
        document.getElementById('companyFilter').addEventListener('input', (e) => {
            this.filters.company = e.target.value;
            this.applyFilters();
        });
        document.getElementById('roleFilter').addEventListener('input', (e) => {
            this.filters.role = e.target.value;
            this.applyFilters();
        });
        document.getElementById('locationFilter').addEventListener('input', (e) => {
            this.filters.location = e.target.value;
            this.applyFilters();
        });
    }

    setupStickyHeader() {
        // Test if sticky positioning is working
        setTimeout(() => {
            const table = document.getElementById('internshipsTable');
            const thead = table?.querySelector('thead');
            
            if (thead) {
                console.log('Table header found, sticky positioning should work');
                console.log('Table position:', table.getBoundingClientRect());
                console.log('Header position:', thead.getBoundingClientRect());
            } else {
                console.log('Table header not found');
            }
        }, 1000);
    }

    async loadInternships() {
        try {
            // Try to load from localStorage first
            const cachedData = localStorage.getItem('internships_2026');
            const cacheTime = localStorage.getItem('internships_2026_time');
            const now = new Date().getTime();
            const oneHour = 60 * 60 * 1000;

            if (cachedData && cacheTime && (now - parseInt(cacheTime)) < oneHour) {
                this.internships = JSON.parse(cachedData);
                this.displayInternships();
                return;
            }

            // Fetch fresh data
            await this.fetchInternships();
        } catch (error) {
            console.error('Error loading internships:', error);
            this.showError('Failed to load internships. Please try again.');
        }
    }

    async fetchInternships() {
        const urls = [
            'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md',
            'https://raw.githubusercontent.com/vanshb03/Summer2026-Internships/main/README.md'
        ];

        const allData = [];
        
        for (const url of urls) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const text = await response.text();
                const data = this.parseReadmeData(text);
                allData.push(...data);
            } catch (error) {
                console.error(`Error fetching from ${url}:`, error);
            }
        }

        // Merge and deduplicate data
        this.internships = this.mergeInternshipData(allData);
        
        // Cache the data
        localStorage.setItem('internships_2026', JSON.stringify(this.internships));
        localStorage.setItem('internships_2026_time', new Date().getTime().toString());

        this.displayInternships();
    }

    parseReadmeData(text) {
        const lines = text.split('\n');
        let tableStart = -1;
        
        // Find the table start
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('| Company | Role | Location | Application/Link | Date Posted |')) {
                tableStart = i;
                break;
            }
        }

        if (tableStart === -1) return [];

        const rows = [];
        for (let i = tableStart + 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || !line.startsWith('|')) break;
            
            const columns = line.split('|').slice(1, -1).map(col => col.trim());
            if (columns.length >= 5) {
                rows.push({
                    Company: columns[0],
                    Role: columns[1],
                    Location: columns[2],
                    'Application/Link': columns[3],
                    'Date Posted': columns[4] || 'Unknown'
                });
            }
        }

        return this.replaceArrowWithValidCompany(rows);
    }

    replaceArrowWithValidCompany(tableData) {
        let lastValidCompany = "";
        for (const row of tableData) {
            if (row.Company === "↳") {
                row.Company = lastValidCompany;
            } else {
                lastValidCompany = row.Company;
            }
        }
        return tableData;
    }

    mergeInternshipData(tableData) {
        const normalize = (text) => {
            return text.toLowerCase()
                .replace(/internship/gi, 'intern')
                .replace(/\W+/g, '');
        };

        const seen = new Set();
        const uniqueData = [];

        for (const row of tableData) {
            const key = `${normalize(row.Company)}_${normalize(row.Role)}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueData.push(row);
            }
        }

        // Sort by date (newest first)
        uniqueData.sort((a, b) => {
            const dateA = this.parseDate(a['Date Posted']);
            const dateB = this.parseDate(b['Date Posted']);
            return dateB - dateA;
        });

        return uniqueData;
    }

    parseDate(dateStr) {
        if (!dateStr || dateStr === 'Unknown') return new Date(0);
        
        try {
            // Handle formats like "Jan 15", "Dec 1", etc.
            const currentYear = new Date().getFullYear();
            const date = new Date(`${dateStr} ${currentYear}`);
            return isNaN(date.getTime()) ? new Date(0) : date;
        } catch {
            return new Date(0);
        }
    }

    displayInternships() {
        this.currentData = [...this.internships];
        this.applyFilters();
    }

    applyFilters() {
        let filteredData = [...this.internships];

        // Apply filters
        if (this.filters.company) {
            if (this.filters.company.startsWith('-')) {
                const excludeTerm = this.filters.company.substring(1).toLowerCase();
                filteredData = filteredData.filter(row => 
                    !row.Company.toLowerCase().includes(excludeTerm)
                );
            } else {
                filteredData = filteredData.filter(row => 
                    row.Company.toLowerCase().includes(this.filters.company.toLowerCase())
                );
            }
        }

        if (this.filters.role) {
            if (this.filters.role.startsWith('-')) {
                const excludeTerm = this.filters.role.substring(1).toLowerCase();
                filteredData = filteredData.filter(row => 
                    !row.Role.toLowerCase().includes(excludeTerm)
                );
            } else {
                filteredData = filteredData.filter(row => 
                    row.Role.toLowerCase().includes(this.filters.role.toLowerCase())
                );
            }
        }

        if (this.filters.location) {
            if (this.filters.location.startsWith('-')) {
                const excludeTerm = this.filters.location.substring(1).toLowerCase();
                filteredData = filteredData.filter(row => 
                    !row.Location.toLowerCase().includes(excludeTerm)
                );
            } else {
                filteredData = filteredData.filter(row => 
                    row.Location.toLowerCase().includes(this.filters.location.toLowerCase())
                );
            }
        }

        // Remove closed internships
        filteredData = filteredData.filter(row => !row['Application/Link'].includes('🔒'));

        this.currentData = filteredData;
        this.renderTable();
        this.updateResultCount();
        this.updateActiveFilters();
    }

    renderTable() {
        const tbody = document.getElementById('internshipsTableBody');
        tbody.innerHTML = '';

        this.currentData.forEach((row, index) => {
            const tr = document.createElement('tr');
            const isApplied = this.isJobApplied(row.Company, row.Role);
            
            tr.innerHTML = `
                <td>
                    <input type="checkbox" ${isApplied ? 'checked' : ''} 
                           data-company="${this.escapeHtml(row.Company)}" 
                           data-role="${this.escapeHtml(row.Role)}"
                           data-location="${this.escapeHtml(row.Location)}"
                           data-link="${this.escapeHtml(row['Application/Link'])}"
                           data-date="${this.escapeHtml(row['Date Posted'])}">
                </td>
                <td>${this.escapeHtml(row.Company)}</td>
                <td>${this.escapeHtml(row.Role)}</td>
                <td>${this.cleanLocation(row.Location)}</td>
                <td>${this.cleanApplicationLink(row['Application/Link'])}</td>
                <td>${this.escapeHtml(row['Date Posted'])}</td>
            `;

            // Add event listener for checkbox
            const checkbox = tr.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => this.toggleApplied(e, row));

            tbody.appendChild(tr);
        });
    }

    toggleApplied(event, row) {
        const isApplied = event.target.checked;
        
        if (isApplied) {
            this.addAppliedJob(row);
        } else {
            this.removeAppliedJob(row.Company, row.Role);
        }
    }

    addAppliedJob(job) {
        const appliedJob = {
            Company: job.Company,
            Role: job.Role,
            Location: job.Location,
            'Application/Link': job['Application/Link'],
            Date: job['Date Posted'],
            Interviewed: false,
            Hired: false
        };
        
        this.appliedJobs.push(appliedJob);
        this.saveAppliedJobs();
    }

    removeAppliedJob(company, role) {
        this.appliedJobs = this.appliedJobs.filter(job => 
            !(job.Company === company && job.Role === role)
        );
        this.saveAppliedJobs();
    }

    isJobApplied(company, role) {
        return this.appliedJobs.some(job => 
            job.Company === company && job.Role === role
        );
    }

    loadAppliedJobs() {
        const stored = localStorage.getItem('applied_jobs_2026');
        return stored ? JSON.parse(stored) : [];
    }

    saveAppliedJobs() {
        localStorage.setItem('applied_jobs_2026', JSON.stringify(this.appliedJobs));
    }

    clearFilters() {
        this.filters = { company: '', role: '', location: '' };
        document.getElementById('companyFilter').value = '';
        document.getElementById('roleFilter').value = '';
        document.getElementById('locationFilter').value = '';
        this.applyFilters();
    }

    async refreshData() {
        localStorage.removeItem('internships_2026');
        localStorage.removeItem('internships_2026_time');
        await this.loadInternships();
    }

    viewAppliedJobs() {
        // Create a modal or redirect to show applied jobs
        this.showAppliedJobsModal();
    }

    showAppliedJobsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Applied Jobs (${this.appliedJobs.length})</h2>
                <div class="applied-jobs-list">
                    ${this.appliedJobs.map(job => `
                        <div class="applied-job">
                            <h3>${this.escapeHtml(job.Company)}</h3>
                            <p><strong>Role:</strong> ${this.escapeHtml(job.Role)}</p>
                            <p><strong>Location:</strong> ${this.cleanLocation(job.Location)}</p>
                            <p><strong>Date Applied:</strong> ${this.escapeHtml(job.Date)}</p>
                            <div class="status-checkboxes">
                                <label>
                                    <input type="checkbox" ${job.Interviewed ? 'checked' : ''} 
                                           data-job-id="${this.appliedJobs.indexOf(job)}" 
                                           data-status="interviewed"> Interviewed
                                </label>
                                <label>
                                    <input type="checkbox" ${job.Hired ? 'checked' : ''} 
                                           data-job-id="${this.appliedJobs.indexOf(job)}" 
                                           data-status="hired"> Hired
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // Status checkbox handlers
        modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const jobId = parseInt(e.target.dataset.jobId);
                const status = e.target.dataset.status;
                const isChecked = e.target.checked;

                if (status === 'interviewed') {
                    this.appliedJobs[jobId].Interviewed = isChecked;
                } else if (status === 'hired') {
                    this.appliedJobs[jobId].Hired = isChecked;
                }

                this.saveAppliedJobs();
            });
        });
    }

    updateResultCount() {
        const count = this.currentData.length;
        const text = count === 1 ? '1 internship found' : `${count} internships found`;
        document.getElementById('resultCount').textContent = text;
    }

    updateActiveFilters() {
        const activeFiltersDiv = document.getElementById('activeFilters');
        const filterList = document.getElementById('filterList');
        
        const activeFilters = [];
        if (this.filters.company) activeFilters.push(`Company: ${this.filters.company}`);
        if (this.filters.role) activeFilters.push(`Role: ${this.filters.role}`);
        if (this.filters.location) activeFilters.push(`Location: ${this.filters.location}`);

        if (activeFilters.length > 0) {
            activeFiltersDiv.style.display = 'block';
            filterList.innerHTML = activeFilters.map(filter => `<li>${filter}</li>`).join('');
        } else {
            activeFiltersDiv.style.display = 'none';
        }
    }

    cleanLocation(location) {
        return location
            .replace(/<br\s*\/?>/gi, '<br>')
            .replace(/<[^>]+>/g, '')
            .replace(/\*\*.*?\*\*/g, '');
    }

    cleanApplicationLink(link) {
        // Extract the first link if there are multiple
        const linkMatch = link.match(/<a\s+[^>]*href="([^"]*)"[^>]*>.*?<\/a>/);
        if (linkMatch) {
            return `<a href="${linkMatch[1]}" target="_blank">Apply</a>`;
        }
        return link;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 1000;
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InternshipSorter();
});
