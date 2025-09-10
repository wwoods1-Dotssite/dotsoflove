// js/contact.js - Contact form functionality with date picker support

// Initialize contact form when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeContactForm();
    setupDateValidation();
});

// Initialize contact form event listeners
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmission);
    }
}

// Setup date validation and constraints
function setupDateValidation() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && endDateInput) {
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        startDateInput.min = today;
        endDateInput.min = today;
        
        // When start date changes, update end date minimum
        startDateInput.addEventListener('change', function() {
            const startDate = this.value;
            if (startDate) {
                endDateInput.min = startDate;
                
                // If end date is before start date, clear it
                if (endDateInput.value && endDateInput.value < startDate) {
                    endDateInput.value = '';
                }
            }
        });
        
        // Validate end date is not before start date
        endDateInput.addEventListener('change', function() {
            const startDate = startDateInput.value;
            const endDate = this.value;
            
            if (startDate && endDate && endDate < startDate) {
                alert('End date cannot be before start date.');
                this.value = '';
            }
        });
    }
}

// Handle contact form submission
async function handleContactSubmission(e) {
    e.preventDefault();
    
    // Validate required fields
    if (!validateContactForm()) {
        return;
    }
    
    // Get form data
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Format dates for backend (combine start and end dates)
    data.dates = formatDatesForSubmission(data.startDate, data.endDate);
    
    // Clean up - remove individual date fields since we're sending combined 'dates'
    delete data.startDate;
    delete data.endDate;
    
    // Show loading state
    const submitButton = e.target.querySelector('.btn');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    
    try {
        // Submit to API
        await API.contact.submit(data);
        
        // Show success message
        Utils.showSuccess('successMessage', 'Thank you for your request! We\'ll contact you soon via your preferred method to discuss your pet sitting needs.');
        
        // Reset form
        e.target.reset();
        
        // Reset date minimums
        setupDateValidation();
        
    } catch (error) {
        console.error('Error submitting contact form:', error);
        alert('There was an error submitting your request. Please try again or call directly.');
        
    } finally {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Format dates for submission
function formatDatesForSubmission(startDate, endDate) {
    if (!startDate) return '';
    
    const startFormatted = formatDateForDisplay(startDate);
    
    if (endDate && endDate !== startDate) {
        const endFormatted = formatDateForDisplay(endDate);
        return `${startFormatted} to ${endFormatted}`;
    }
    
    return startFormatted;
}

// Format date for display (converts 2024-12-25 to December 25, 2024)
function formatDateForDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00'); // Prevent timezone issues
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Enhanced validation for date fields
function validateContactForm() {
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const name = document.getElementById('name').value.trim();
    const bestTime = document.getElementById('bestTime').value;
    const startDate = document.getElementById('startDate').value;
    
    // Check required fields
    if (!name) {
        alert('Please enter your name.');
        document.getElementById('name').focus();
        return false;
    }
    
    if (!bestTime) {
        alert('Please select the best time to call.');
        document.getElementById('bestTime').focus();
        return false;
    }
    
    if (!startDate) {
        alert('Please select a start date for the service.');
        document.getElementById('startDate').focus();
        return false;
    }
    
    // Validate start date is not in the past
    const today = new Date().toISOString().split('T')[0];
    if (startDate < today) {
        alert('Start date cannot be in the past.');
        document.getElementById('startDate').focus();
        return false;
    }
    
    // Check that either email or phone is provided
    if (!email && !phone) {
        alert('Please provide either an email address or phone number so we can contact you.');
        document.getElementById('email').focus();
        return false;
    }
    
    // Validate email format if provided
    if (email && !Utils.isValidEmail(email)) {
        alert('Please enter a valid email address.');
        document.getElementById('email').focus();
        return false;
    }
    
    // Validate phone format if provided
    if (phone && !Utils.isValidPhone(phone)) {
        alert('Please enter a valid phone number.');
        document.getElementById('phone').focus();
        return false;
    }
    
    return true;
}

// Auto-fill service options based on rates (optional enhancement)
async function loadServiceOptions() {
    try {
        const rates = await API.rates.getAll();
        const serviceSelect = document.getElementById('service');
        
        if (serviceSelect && rates.length > 0) {
            // Keep existing options and add new ones from rates
            const existingOptions = Array.from(serviceSelect.options).map(opt => opt.value);
            
            rates.forEach(rate => {
                const serviceValue = rate.service_type.toLowerCase().replace(/\s+/g, '-');
                
                // Only add if not already exists
                if (!existingOptions.includes(serviceValue)) {
                    const option = document.createElement('option');
                    option.value = serviceValue;
                    option.textContent = rate.service_type;
                    serviceSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading service options:', error);
        // Don't show error to user, just use default options
    }
}

// Load service options when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure API is loaded
    setTimeout(loadServiceOptions, 100);
});
