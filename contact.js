// js/contact.js - Contact form functionality

// Initialize contact form when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeContactForm();
});

// Initialize contact form event listeners
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmission);
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
        
    } catch (error) {
        console.error('Error submitting contact form:', error);
        alert('There was an error submitting your request. Please try again or call directly.');
        
    } finally {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Validate contact form
function validateContactForm() {
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const name = document.getElementById('name').value.trim();
    const bestTime = document.getElementById('bestTime').value;
    
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