// --- DOM Elements ---
const form = document.getElementById("record-form");
const leadSourceSelect = document.getElementById("lead-source-select");
const bpField = document.getElementById("bp-field");
const employeeField = document.getElementById("employee-field");
const referrerGroup = document.getElementById("referrer-group");
const bpDropdown = document.getElementById('business-partner');
const employeeDropdown = document.getElementById('employee-name');
const messageContainer = document.getElementById('message-container');
const messageText = document.getElementById('message-text');
const submitButton = document.getElementById('submit_button_id');

// --- Validation Configuration ---
const fieldsConfig = [
    // Core Fields (Always Required unless marked optional)
    { id: "first-name", label: "First Name", type: 'text', errorId: "error-first-name" },
    { id: "last-name", label: "Last Name", type: 'text', errorId: "error-last-name" },
    { id: "email", label: "Email", type: 'email', errorId: "error-email" },
    { id: "mobile", label: "Mobile", type: 'mobile', errorId: "error-mobile", optional: true },
    { id: "lead-source-select", label: "Lead Source", type: 'text', errorId: "error-lead-source-select" },

    // Conditional Fields (IDs are passed for lookup fields)
    { id: "business-partner", label: "Business Partner", type: 'text', errorId: "error-business-partner", requiredWhen: ["Business Partner Referrals"] },
    { id: "employee-name", label: "Employee Name", type: 'text', errorId: "error-employee-name", requiredWhen: ["Employee Referrals"] },
    { id: "referrer-full-name", label: "Referrer's Full Name", type: 'text', errorId: "error-referrer-full-name", requiredWhen: ["Existing Clients - Referrals", "External Referrals"] },
    { id: "referrer-contact-number", label: "Contact Number", type: 'mobile', errorId: "error-referrer-contact-number", requiredWhen: ["Existing Clients - Referrals", "External Referrals"] },
    { id: "referrer-email-address", label: "Referrer's Email", type: 'email', errorId: "error-referrer-email-address", requiredWhen: ["Existing Clients - Referrals", "External Referrals"] },
];
// --- Utility Functions ---

const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const isMobileValid = (mobile) => /^[0-9\-\s\(\)\+]{7,15}$/.test(mobile.trim());

const setError = (field, message) => {
    const errorElement = document.getElementById(`error-${field.id}`);
    if (errorElement) {
        errorElement.textContent = message;
    }
    if (message) {
        field.classList.add('border-red-500');
        field.classList.remove('border-gray-300');
    } else {
        field.classList.remove('border-red-500');
        field.classList.add('border-gray-300');
    }
};

function displayMessage(type, message) {
    messageContainer.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800');
    if (type === 'success') {
        messageContainer.classList.add('bg-green-100', 'text-green-800');
    } else {
        messageContainer.classList.add('bg-red-100', 'text-red-800');
    }
    messageText.textContent = message;
}

function clearForm() {
    form.reset();
    resetConditionalFields();
    document.querySelectorAll(".error-message").forEach((el) => (el.textContent = ""));
    document.querySelectorAll(".border-red-500").forEach((el) => {
        el.classList.remove('border-red-500');
        el.classList.add('border-gray-300');
    });
}

function resetConditionalFields() {
    // Hide all conditional groups
    [bpField, employeeField, referrerGroup].forEach(el => el.classList.add('hidden'));

    // Clear values for conditional inputs/selects
    document.querySelectorAll('#conditional-fields input, #conditional-fields select').forEach(input => {
        if (input.tagName === 'SELECT') {
            input.value = '';
        } else {
            input.value = '';
        }
        setError(input, ""); // Clear visual errors
    });
}


// --- Close Widget ---
    async function closeWidget() {
      await ZOHO.CRM.UI.Popup.closeReload().catch(err => console.error("Error closing widget:", err));
    }

/**
 * Loads Business Partner and Employee/User data from Zoho CRM.
 * IMPORTANT: The Zoho Record ID is stored in the option's value for submission.
 */
async function loadDropdownData() {
    // Clear existing options
    while (bpDropdown.options.length > 1) { bpDropdown.remove(1); }
    while (employeeDropdown.options.length > 1) { employeeDropdown.remove(1); }

    // 1. Fetch Business Partners
    try {
        const bpResponse = await ZOHO.CRM.API.getAllRecords({ Entity: "Business_Partners", sort_order: "asc" });

        if ( bpResponse.data && bpResponse.data.length > 0) {
            const activePartnersData = bpResponse.data.filter(partner => partner.Status !== 'Cancelled');
            activePartnersData.forEach(bp => {
                const option = document.createElement('option');
                // Store the Record ID in the value
                option.value = bp.id; 
                option.textContent = bp.Name || `Partner ${bp.id}`; 
                bpDropdown.appendChild(option);
            });
            console.log(`Loaded ${activePartnersData.length} ACTIVE Business Partners.`);
        }
    } catch (error) {
        console.error("Error fetching Business Partners via Zoho API:", error);
    }

    // 2. Fetch Employees (Users)
    try {
        const employeeResponse = await ZOHO.CRM.API.getAllUsers({ Type: 'AllUsers' });

        if (employeeResponse.users && employeeResponse.users.length > 0) {
            const allowedProfileNames = ['TA-Accountants', 'TA-General Manager', 'TA-BP Support'];
            
            const activeUsers = employeeResponse.users.filter(user => 
                user.status === 'active' && 
                user.profile && 
                allowedProfileNames.includes(user.profile.name)
            );

            activeUsers.forEach(user => {
                const option = document.createElement('option');
                // Store the User ID in the value
                option.value = user.first_name + " " + user.last_name; // Corrected: Use user.id for the lookup field payload
                option.textContent = user.full_name || user.email; 
                employeeDropdown.appendChild(option);

            });
            console.log(`Loaded ${activeUsers.length} Employees/Users.`);
        }
    } catch (error) {
        console.error("Error fetching Employees (Users) via Zoho API:", error);
    }
}

// --- UI Visibility Toggler ---
const toggleConditionalFields = () => {
    const selectedSource = leadSourceSelect.value;

    resetConditionalFields();

    if (selectedSource === "Business Partner Referrals") {
        bpField.classList.remove('hidden');
    } else if (selectedSource === "Employee Referrals") {
        employeeField.classList.remove('hidden');
    } else if (["Existing Clients - Referrals", "External Referrals"].includes(selectedSource)) {
        referrerGroup.classList.remove('hidden');
    }
};


/**
 * Constructs the Lead record payload for Zoho CRM.
 * Uses exact API names and passes IDs for lookup fields.
 */
function buildLeadPayload() {
    const selectedSource = leadSourceSelect.value;
    
    // Initialize the core payload with standard fields
    const payload = {
        // Standard Lead Fields
        'First_Name': document.getElementById('first-name').value.trim(),
        'Last_Name': document.getElementById('last-name').value.trim(),
        'Email': document.getElementById('email').value.trim(),
        'Mobile': document.getElementById('mobile').value.trim(),
        'Lead_Source': selectedSource, // This is the standard Zoho Lead Source picklist field
        'Lead_Status': 'New', // Default status for new leads
        'Looking_for_a_Job': 'NO', // Default value for custom field
        'Organization': 'TLZ', // Default value for required Organization field
        // Initialize Lookup Fields to null (Zoho API prefers null for empty lookups)
        'Test_Business_Partner': null, 
        'Employee_Name': null,

        // Initialize Custom Referrer Fields to empty strings
        'Referred_by': '',      // Custom Field: Referrer's Full Name
        'Contact_Number': '',   // Custom Field: Referrer's Contact Number
        'Email_Address': '',    // Custom Field: Referrer's Email Address
    };

    // --- Conditional Logic for Lookups and Referrer Details ---
    if (selectedSource === 'Business Partner Referrals') {
        // Pass the BP ID for the lookup field
        payload['Test_Business_Partner'] = bpDropdown.value; 
    } else if (selectedSource === 'Employee Referrals') {
        // Pass the Employee User ID for the lookup field
        payload['Employee_Name'] = employeeDropdown.value; 
    } else if (['Existing Clients - Referrals', 'External Referrals'].includes(selectedSource)) {
        // Set the custom Referrer text fields
        payload['Referred_by'] = document.getElementById('referrer-full-name').value.trim();
        payload['Contact_Number'] = document.getElementById('referrer-contact-number').value.trim();
        payload['Email_Address'] = document.getElementById('referrer-email-address').value.trim();
    }
    // For all other Lead Sources, the Business_Partner, Employee_Name, and custom referrer fields remain blank/null or empty string.

    return payload;
}

/**
 * Submits the lead record using the ZOHO.CRM.API.insertRecord function.
 * This is the function where the ZOHO API call logic has been updated.
 */
async function submitLeadToZoho() {
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    // messageContainer.classList.add('hidden');
    console.log('Preparing to submit lead to Zoho CRM...');
    const recordData = buildLeadPayload();
    console.log('Constructed Lead Payload:', recordData);    
    // Structure the data for ZOHO.CRM.API.insertRecord
    const data = {
        'Entity': 'Leads', // Use 'Entity' for insertRecord
        'APIData': recordData // Pass the single record object under 'APIData'
        // 'Trigger': ["workflow"] // CRITICAL: This executes workflows
    };

    console.log('Attempting to create lead with payload (insertRecord):', data);

    try {
        // await ZOHO.CRM.API.insertRecord({
        //     Entity: "Leads",
        //     APIData: recordData
        //     // Trigger: ["workflow"]
        // }).then(function(data){
        //     console.log('InsertRecord Promise Resolved:', data);
        //     console.log('Full Response Data:', data.data[0].status);
        //     if (data.data[0].status === "success") {
        //         console.log('Lead record created successfully with ID:', data.data[0].details.id); 
        //         alert('Lead record created successfully!');
        //         // displayMessage('success', 'Lead record created successfully!');
        //         // clearForm();
        //         // Button remains disabled here
        //         setTimeout(closeWidget, 2000);
        //     } else {
        //         const errorMsg = data.message || 'An error occurred while creating the lead record.';
        //         displayMessage('error', errorMsg);
        //         // Re-enable button on API-level error
        //         submitButton.disabled = false;
        //         submitButton.textContent = 'Submit Lead Record';
        //     }
        // });
        // console.log('Zoho CRM Response (insertRecord):', data);
        const func_name = "ta_lead_submission";
        const req_data = {
        "arguments": JSON.stringify({
            "first_name": document.getElementById('first-name').value.trim(),
            "last_name": document.getElementById('last-name').value.trim(),
            "email": document.getElementById('email').value.trim(),
            "mobile": document.getElementById('mobile').value.trim(),
            "lead_source": leadSourceSelect.value,
            "lead_status": "New",
            "looking_for_a_job": "NO",
            "organization": "TLZ",
            "business_partner": bpDropdown.value,
            "employee_name": employeeDropdown.value,
            "referred_by": document.getElementById('referrer-full-name').value.trim(),
            "contact_number": document.getElementById('referrer-contact-number').value.trim(),
            "email_address": document.getElementById('referrer-email-address').value.trim()
        })
    };
    const lead_res = await ZOHO.CRM.FUNCTIONS.execute(func_name, req_data);
    console.log("Lead Added Function Response:", lead_res);
    console.log('Lead Res Code:', lead_res.code);
    const lead_creation_status = lead_res.details.userMessage;
    console.log('Lead Creation Status:', lead_creation_status);
    if(lead_creation_status && lead_creation_status.includes('true')) {
        console.log('Lead record created successfully with ID:', lead_res);
        alert('Lead record created successfully!');
        // displayMessage('success', 'Lead record created successfully!');
        // clearForm();
        // Button remains disabled here
        setTimeout(closeWidget, 2000);
    } else {
        alert('A lead with this email already exists. Please use a different email address.');
        // Re-enable button on API-level error
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Lead Record';
        }

    } catch (error) {
        // Re-enable button on critical error
        submitButton.disabled = false;
        alert('An error occurred while submitting the lead. Please try again later.');
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Lead Record';
    } 
    // Removed the 'finally' block to prevent the button from being re-enabled on success.
}


// --- Initialization and Main Event Listener ---
document.addEventListener("DOMContentLoaded", function () {

    // 1. Initial UI Setup and Listeners
    leadSourceSelect.addEventListener('change', toggleConditionalFields);
    toggleConditionalFields(); // Set initial state

    // 2. Form Submission Listener
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        let isValid = true;
        const selectedSource = leadSourceSelect.value;

        // Clear all errors and borders
        document.querySelectorAll(".error-message").forEach((el) => (el.textContent = ""));
        document.querySelectorAll("#record-form input, #record-form select").forEach(field => {
             field.classList.remove('border-red-500');
             field.classList.add('border-gray-300');
        });


        fieldsConfig.forEach(config => {
            const field = document.getElementById(config.id);
            const value = field.value.trim();

            const isCoreField = !config.requiredWhen;
            const isConditionalRequired = config.requiredWhen && config.requiredWhen.includes(selectedSource);
            // Check if the field is required or if it has a value for validation
            const isRequired = isConditionalRequired || (isCoreField && !config.optional); 

            // 1. Check for Emptiness (only if required)
            if (isRequired) {
                if (!value) {
                    setError(field, `${config.label} is required.`);
                    isValid = false;
                    return;
                }
            }

            // 2. Check for Format (if a value exists, regardless of whether the field was required)
            if (value) {
                if (config.type === 'email' && !isEmailValid(value)) {
                    setError(field, `Please enter a valid email address.`);
                    isValid = false;
                } else if (config.type === 'mobile' && !isMobileValid(value)) {
                    setError(field, `Please enter a valid number (7–15 digits).`);
                    isValid = false;
                }
            }
        });

        // Stop submission if invalid
        if (!isValid) {
            displayMessage('error', 'Please correct the highlighted fields before submitting.');
            return;
        }

        // If all validations pass, submit the lead
        submitLeadToZoho();
    });

    

    // 3. Initialize the Zoho SDK and load data upon ready state
    ZOHO.embeddedApp.on('PageLoad', function(data) {
        console.log("Zoho PageLoad event received:", data);
        // Call data loading only when the SDK is ready
        loadDropdownData();
    });

    // Start the SDK initialization process
    ZOHO.embeddedApp.init();

});