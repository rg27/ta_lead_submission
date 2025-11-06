// --- Global Elements ---
const recordForm = document.getElementById('record-form');
const submitButton = document.getElementById('submit-button');
const leadSourceSelect = document.getElementById('lead-source-select');
const businessPartnerGroup = document.getElementById('business-partner-group');
const employeeNameGroup = document.getElementById('employee-name-group');
const referrerDetailsGroup = document.getElementById('referrer-details-group');
const statusModalOverlay = document.getElementById('status-modal-overlay');
const statusIcon = document.getElementById('status-icon');
const statusMessage = document.getElementById('status-message');
const businessPartner = document.getElementById('business-partner');


// Regex for basic email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
// Regex for basic mobile number validation (7 to 20 characters including digits, optional '+', and common separators)
const mobileRegex = /^\+?[\d\s\-\(\)]{7,20}$/; 


// --- Utility Functions ---

/**
 * Clears all validation error messages and removes error styling from fields.
 */
function clearErrors() {
    // Clear all error messages
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(el => el.textContent = '');
    
    // Remove error border from all fields
    const errorFields = recordForm.querySelectorAll('.border-red-500');
    errorFields.forEach(el => el.classList.remove('border-red-500', 'border-2'));
}

/**
 * Displays an error message and highlights the corresponding field.
 * @param {string} fieldId - The ID of the form field.
 * @param {string} message - The error message to display.
 */
function showError(fieldId, message) {
    const errorElement = document.getElementById(`error-${fieldId}`);
    const fieldElement = document.getElementById(fieldId);
    if (errorElement) {
        errorElement.textContent = message;
    }
    if (fieldElement) {
        fieldElement.classList.add('border-red-500', 'border-2');
    }
}

/**
 * Checks if a given string is a valid email format.
 */
function isValidEmail(email) {
    if (!email) return false;
    return emailRegex.test(email.trim());
}

/**
 * Checks if a given string is a valid mobile number format.
 */
function isValidMobile(mobile) {
    if (!mobile) return false;
    
    // Check 1: General format check allowing separators
    if (!mobileRegex.test(mobile.trim())) {
        return false;
    }
    
    // Check 2: Ensure the numeric part is within a common range (7 to 15 digits)
    const numericPart = mobile.replace(/[^\d]/g, ''); 
    return numericPart.length >= 7 && numericPart.length <= 15;
}


/**
 * Shows the status modal (success or error).
 */
function showStatusModal(type, message) {
    statusIcon.className = 'status-icon'; 
    statusModalOverlay.className = 'status-modal-overlay'; 
    
    const isSuccess = type === 'success';

    statusModalOverlay.classList.add(isSuccess ? 'status-success' : 'status-failure');
    statusIcon.classList.add(isSuccess ? 'success-icon' : 'error-icon');
    
    statusIcon.textContent = isSuccess ? '✔' : '✖';
    statusMessage.textContent = message; 
    statusModalOverlay.style.display = 'flex';

    setTimeout(() => {
        statusModalOverlay.style.display = 'none';
    }, 3000);
}

/**
 * Toggles visibility and 'required' state for a field group.
 * This is crucial for making conditional fields mandatory only when they are shown.
 */
function toggleFieldGroup(group, isVisible) {
    group.classList.toggle('hidden-field-group', !isVisible);

    const requiredFields = group.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (isVisible) {
            field.setAttribute('required', 'required');
        } else {
            field.removeAttribute('required');
            
            // Clear value and error message when hiding
            field.value = (field.tagName === 'SELECT' && field.querySelector('option[disabled]')) 
                            ? field.querySelector('option[disabled]').value 
                            : '';
            // Note: Errors are cleared globally by clearErrors() on submit, but 
            // the state reset here is important for fields that were previously invalid.
            const errorSpan = document.getElementById(`error-${field.id}`);
            if (errorSpan) {
                errorSpan.textContent = '';
                field.classList.remove('border-red-500', 'border-2');
            }
        }
    });
}

/**
 * Handles showing/hiding conditional fields based on Lead Source selection.
 */
function handleLeadSourceChange() {
    const selectedValue = leadSourceSelect.value;

    // Hide all conditional groups first
    toggleFieldGroup(businessPartnerGroup, false);
    toggleFieldGroup(employeeNameGroup, false);
    toggleFieldGroup(referrerDetailsGroup, false);
    
    // Show only the relevant group
    switch (selectedValue) {
        case 'Business Partner Referrals':
            toggleFieldGroup(businessPartnerGroup, true);
            break;
        case 'Employee Referrals':
            toggleFieldGroup(employeeNameGroup, true);
            break;
        case 'Existing Clients - Referrals':
        case 'External Referrals':
            toggleFieldGroup(referrerDetailsGroup, true);
            break;
        default:
            break;
    }
}

// --- Dynamic Data Fetching Functions ---

/**
 * Fetches active Business Partners and populates the dropdown.
 */
async function fetchBusinessPartners() {
    const selectElement = document.getElementById("business-partner");
    if (!selectElement || typeof ZOHO === 'undefined') return;

    const defaultOption = selectElement.querySelector('option[disabled][selected]');
    selectElement.innerHTML = '';
    if (defaultOption) {
        selectElement.appendChild(defaultOption);
    }
    
    try {
        const response = await ZOHO.CRM.API.getAllRecords({
            Entity: "Business_Partners", 
            sort_order: "asc", 
        });

        if (response.data && response.data.length > 0) {
            const activePartners = response.data.filter(partner => partner.Status !== 'Cancelled');
            
            activePartners.forEach(partner => {
                const partnerName = partner.Name || 'Unnamed Partner';
                const partnerId = partner.id; 

                if (partnerName && partnerId) {
                    const option = document.createElement('option');
                    option.value = partnerId;
                    option.textContent = partnerName;
                    selectElement.appendChild(option);
                }
            });
            console.log(`Successfully loaded ${activePartners.length} active Business Partners.`);
        } else {
            console.warn("API returned no active Business Partners.");
        }

    } catch (err) {
        console.error("Error fetching Business Partners:", err);
        showStatusModal('error', "Could not load Business Partner list.");
    }
}


/**
 * Fetches all active Zoho Users (Employees) with specific profiles.
 */
async function fetchAndPopulateEmployees() { 
    const employeeSelect = document.getElementById('employee-name');
    
    if (!employeeSelect || typeof ZOHO === 'undefined') return;

    const defaultOption = employeeSelect.querySelector('option[disabled][selected]');
    employeeSelect.innerHTML = '';
    if (defaultOption) {
        employeeSelect.appendChild(defaultOption);
    }

    try {
        const response = await ZOHO.CRM.API.getAllUsers({ Type: 'AllUsers' });

        if (response.users && response.users.length > 0) {
            
            const activeUsers = response.users.filter(user => 
                user.status === 'active' && user.profile && 
                (user.profile.name === 'TA-Accountants' || user.profile.name === 'TA-General Manager')
            );
            
            const fragment = document.createDocumentFragment();
            activeUsers.forEach(user => {
                const fullName = user.full_name || `${user.first_name} ${user.last_name}`;
                const option = document.createElement('option');
                option.value = user.id; 
                option.textContent = fullName;
                fragment.appendChild(option);
            });

            employeeSelect.appendChild(fragment);
            console.log(`Successfully loaded ${activeUsers.length} active Zoho Employees.`);
            
        } else {
            console.warn("API returned success but no users found.");
        }
    } catch (error) {
        console.error("Error fetching Zoho employees:", error);
        showStatusModal('error', 'Could not load Employee list.');
    }
}


/**
 * Submits the lead data to Zoho CRM using the addRecord API.
 */
function submitLeadRecord(formData) {
    // --- Map Form IDs to Zoho API Field Names ---
    const apiData = {
        "First_Name": formData['first-name'],
        "Last_Name": formData['last-name'],
        "Email": formData['email'],
        "Mobile": formData['mobile'],
        "Lead_Source": formData['lead-source-select'],
        
        // Conditional fields
        // Note: We send the ID for the Business Partner and Employee lookup fields
        "Business_Partner_Referral_Name": formData['business-partner'] || '', 
        "Employee_Referral_ID": formData['employee-name'] || '', 
        "Referrer_Full_Name": formData['referrer-full-name'] || '', 
        "Referrer_Contact_Number": formData['contact-number'] || '',
        "Referrer_Email_Address": formData['referrer-email-address'] || '',
    };
    
    // Clean up empty fields
    Object.keys(apiData).forEach(key => {
        if (!apiData[key]) {
            delete apiData[key];
        }
    });

    const leadData = {
        data: [apiData],
        trigger: ["workflow", "blueprint"]
    };

    ZOHO.CRM.API.addRecord({
        Entity: "Leads", 
        APIData: leadData 
    })
    .then(function(data) {
        console.log("Zoho API Response:", data);
        
        if (data?.data?.[0]?.code === "SUCCESS") {
            showStatusModal('success', 'Lead successfully captured!');
            recordForm.reset(); 
            handleLeadSourceChange(); // Reset conditional fields state
        } else {
            const errorMessage = data?.data?.[0]?.details?.reason || data?.data?.[0]?.message || 'An unknown API error occurred.';
            showStatusModal('error', errorMessage);
        }
    })
    .catch(function(error) {
        console.error("Zoho API Error:", error);
        showStatusModal('error', 'Network or API failure. Check console for details.');
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit';
    });
}

/**
 * Checks if a field is currently visible to the user.
 */
function isFieldVisible(field) {
    if (field.id === 'lead-source-select') return true;
    
    // If field is inside a container marked with 'hidden-field-group', it's not visible
    return !field.closest('.hidden-field-group');
}


function isFieldVisible(field) {
    if (field.id === 'business-partner') return true;
    
    // If field is inside a container marked with 'hidden-field-group', it's not visible
    return !field.closest('.hidden-field-group');
}

/**
 * Handles the form submission event. Implements all validation rules.
 */
function handleFormSubmit(event) {
    // 🛑 CRITICAL FIX: Stop multiple submission attempts
    event.stopImmediatePropagation(); 
    event.preventDefault();
    
    // 1. Clear all previous errors
    clearErrors(); 

    let isValid = true;
    // Target elements that should be validated
    console.log(recordForm);
    const formElements = recordForm.querySelectorAll('input:not([type="submit"]), select, textarea');
    console.log("Starting form validation...");
    formElements.forEach(field => {
        const fieldId = field.id;
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required'); 
        let errorMessage = '';
        console.log(`Validating field: ${fieldId} with value: "${value}" (Required: ${isRequired})`);
        
        // 1. Skip validation if the field is hidden
        if (!isFieldVisible(field)) {
            return;
        }
        console.log(`Field ${fieldId} is visible and will be validated.`);

        // 2. Mandatory Field Check (Required fields must have a value)
        if (isRequired && (value === '' || (field.tagName === 'SELECT' && value === ''))) {
            isValid = false;
          
            switch (fieldId) {
                case 'lead-source-select':
                    errorMessage = 'Please select a lead source.';
                    break;
                case 'business-partner':
                    // Enforcement for mandatory Business Partner
                    errorMessage = 'Please select a Business Partner.';
                    break;
                default:
                    errorMessage = 'This field is required.';
            }
            // console.log(`Field ${fieldId} failed mandatory check.`);
        } 
        
        // 3. Format Validation (Only run if value is present and passed mandatory check)
        else if (value.length > 0) {
            if ((fieldId === 'email' || fieldId === 'referrer-email-address') && !isValidEmail(value)) {
                errorMessage = 'Please enter a valid email format.';
                isValid = false; 
            }
            
            if ((fieldId === 'mobile' || fieldId === 'contact-number') && !isValidMobile(value)) {
                errorMessage = 'Please enter a valid mobile number (7-15 digits).';
                isValid = false; 
            }
        }

        // Display the final error message using the helper function
        if (errorMessage) {
            showError(fieldId, errorMessage);
        }
    });


    if (isValid) {
        console.log("VALIDATION PASSED: Submitting form.");
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        
        // Gather Form Data
        const formData = {};
        Array.from(recordForm.elements).forEach(element => {
            if (element.id && element.value && element.type !== 'submit') {
                formData[element.id] = element.value;
            }
        });
        
        submitLeadRecord(formData);

    } else {
        console.error("VALIDATION FAILED: Stopping submission.");
        showStatusModal('error', 'Please correct the highlighted fields.');
    }
}

/**
 * Main Initialization Function (Triggered by Zoho SDK)
 */
function initZohoApp() {
    // 1. Set up listeners and initial state
    handleLeadSourceChange(); 
    leadSourceSelect.addEventListener('change', handleLeadSourceChange);
    recordForm.addEventListener('submit', handleFormSubmit);

    // 2. Fetch dynamic data
    fetchAndPopulateEmployees(); 
    fetchBusinessPartners(); 
}

// Global function to close the widget
function closeWidget() {
    if (typeof ZOHO !== 'undefined' && ZOHO.CRM.UI.Popup) {
        ZOHO.CRM.UI.Popup.close();
    } else {
        console.warn('Zoho SDK close function not available.');
    }
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Attach main initialization function to Zoho PageLoad event
    if (typeof ZOHO !== 'undefined' && ZOHO.embeddedApp) {
        ZOHO.embeddedApp.on('PageLoad', function() {
            initZohoApp();
        });
        ZOHO.embeddedApp.init();
    } else {
        console.error("Zoho SDK not found. Running fallback initialization.");
        // Fallback for non-Zoho environment testing
        initZohoApp();
    }
});