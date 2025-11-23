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

// --- Modal Elements ---
const customModal = document.getElementById('custom-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalIcon = document.getElementById('modal-icon');
const modalCloseBtn = document.getElementById('modal-close-btn');

// --- Validation Configuration ---
const fieldsConfig = [
    { id: "first-name", label: "First Name", type: 'text', errorId: "error-first-name" },
    { id: "last-name", label: "Last Name", type: 'text', errorId: "error-last-name" },
    { id: "email", label: "Email", type: 'email', errorId: "error-email" },
    { id: "mobile", label: "Mobile", type: 'mobile', errorId: "error-mobile", optional: true },
    { id: "lead-source-select", label: "Lead Source", type: 'text', errorId: "error-lead-source-select" },
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
    if (messageContainer) {
        messageContainer.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800');
        if (type === 'success') {
            messageContainer.classList.add('bg-green-100', 'text-green-800');
        } else {
            messageContainer.classList.add('bg-red-100', 'text-red-800');
        }
        messageText.textContent = message;
    }
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
    [bpField, employeeField, referrerGroup].forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#conditional-fields input, #conditional-fields select').forEach(input => {
        if (input.tagName === 'SELECT') {
            input.value = '';
        } else {
            input.value = '';
        }
        setError(input, "");
    });
}

// --- Modal Functionality ---
function showCustomModal(type, title, message, callback) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Reset classes
    modalIcon.className = "mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4";
    
    if (type === 'success') {
        modalIcon.classList.add('bg-green-100');
        modalIcon.innerHTML = `<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
        modalCloseBtn.classList.remove('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500');
        modalCloseBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700', 'focus:ring-indigo-500');
    } else {
        modalIcon.classList.add('bg-red-100');
        modalIcon.innerHTML = `<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
        modalCloseBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700', 'focus:ring-indigo-500');
        modalCloseBtn.classList.add('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500');
    }

    customModal.classList.remove('hidden');

    // Handle button click
    modalCloseBtn.onclick = function() {
        customModal.classList.add('hidden');
        if (callback && typeof callback === "function") {
            callback();
        }
    };
}

// --- Close Widget ---
async function closeWidget() {
    await ZOHO.CRM.UI.Popup.closeReload().catch(err => console.error("Error closing widget:", err));
}

async function loadDropdownData() {
    while (bpDropdown.options.length > 1) { bpDropdown.remove(1); }
    while (employeeDropdown.options.length > 1) { employeeDropdown.remove(1); }

    try {
        const bpResponse = await ZOHO.CRM.API.getAllRecords({ Entity: "Business_Partners", sort_order: "asc" });

        if ( bpResponse.data && bpResponse.data.length > 0) {
            const activePartnersData = bpResponse.data.filter(partner => partner.Status !== 'Cancelled');
            activePartnersData.forEach(bp => {
                const option = document.createElement('option');
                option.value = bp.id; 
                option.textContent = bp.Name || `Partner ${bp.id}`; 
                bpDropdown.appendChild(option);
            });
            console.log(`Loaded ${activePartnersData.length} ACTIVE Business Partners.`);
        }
    } catch (error) {
        console.error("Error fetching Business Partners via Zoho API:", error);
    }

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
                option.value = user.first_name + " " + user.last_name; 
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

function buildLeadPayload() {
    const selectedSource = leadSourceSelect.value;
    
    const payload = {
        'First_Name': document.getElementById('first-name').value.trim(),
        'Last_Name': document.getElementById('last-name').value.trim(),
        'Email': document.getElementById('email').value.trim(),
        'Mobile': document.getElementById('mobile').value.trim(),
        'Lead_Source': selectedSource, 
        'Lead_Status': 'New', 
        'Looking_for_a_Job': 'NO', 
        'Organization': 'TLZ', 
        'Test_Business_Partner': null, 
        'Employee_Name': null,
        'Referred_by': '', 
        'Contact_Number': '', 
        'Email_Address': '', 
    };

    if (selectedSource === 'Business Partner Referrals') {
        payload['Test_Business_Partner'] = bpDropdown.value; 
    } else if (selectedSource === 'Employee Referrals') {
        payload['Employee_Name'] = employeeDropdown.value; 
    } else if (['Existing Clients - Referrals', 'External Referrals'].includes(selectedSource)) {
        payload['Referred_by'] = document.getElementById('referrer-full-name').value.trim();
        payload['Contact_Number'] = document.getElementById('referrer-contact-number').value.trim();
        payload['Email_Address'] = document.getElementById('referrer-email-address').value.trim();
    }

    return payload;
}

async function submitLeadToZoho() {
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    console.log('Preparing to submit lead to Zoho CRM...');
    const recordData = buildLeadPayload();
    console.log('Constructed Lead Payload:', recordData);    
    const data = {
        'Entity': 'Leads', 
        'APIData': recordData 
    };

    console.log('Attempting to create lead with payload (insertRecord):', data);

    try {
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
        
        // SUCCESS MODAL REPLACING ALERT
        showCustomModal('success', 'Success!', 'Lead record created successfully.', function() {
            setTimeout(closeWidget, 500);
        });

    } else {
        // FAILURE MODAL REPLACING ALERT
        showCustomModal('error', 'Submission Failed', 'A lead with this email already exists. Please use a different email address.', function() {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Lead Record';
        });
    }

    } catch (error) {
        // ERROR MODAL REPLACING ALERT
        showCustomModal('error', 'System Error', 'An error occurred while submitting the lead. Please try again later.', function() {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Lead Record';
        });
    } 
}


// --- Initialization and Main Event Listener ---
document.addEventListener("DOMContentLoaded", function () {

    leadSourceSelect.addEventListener('change', toggleConditionalFields);
    toggleConditionalFields(); 

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        let isValid = true;
        const selectedSource = leadSourceSelect.value;

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
            const isRequired = isConditionalRequired || (isCoreField && !config.optional); 

            if (isRequired) {
                if (!value) {
                    setError(field, `${config.label} is required.`);
                    isValid = false;
                    return;
                }
            }

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

        if (!isValid) {
            // Optional: You can also use the new modal here if you want, but keeping existing behavior for validation logic is usually better.
            // displayMessage('error', 'Please correct the highlighted fields before submitting.');
            return;
        }

        submitLeadToZoho();
    });

    ZOHO.embeddedApp.on('PageLoad', function(data) {
        console.log("Zoho PageLoad event received:", data);
        loadDropdownData();
    });

    ZOHO.embeddedApp.init();

});