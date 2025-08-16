document.addEventListener('DOMContentLoaded', () => {
  // Retrieve the email from the URL parameters (if applicable)
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  
  if (email) {
    document.getElementById('email').value = decodeURIComponent(email);
  } else {
    console.error('Email parameter is missing');
  }
});

// Event listener for name validation on blur
document.getElementById('name').addEventListener('blur', async () => {
  const nameInput = document.getElementById('name');
  const email = document.getElementById('email').value.trim();
  const name = nameInput.value.trim().toUpperCase(); // Ensure uppercase formatting
  nameInput.value = name; // Set the name back in uppercase

  console.log(`Sending request with email: ${email} and name: ${name}`);
  
  if (name && email) {
    try {
      // Send a POST request to validate the name and email
      const response = await fetch('/validateName', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });

      const result = await response.json();
      const messageElement = document.getElementById('name-exist-message');

      if (response.ok && result.valid) {
        // If the name matches, apply the 'valid' class
        nameInput.classList.add('valid');
        nameInput.classList.remove('invalid');
        messageElement.textContent = ''; // Clear any previous error message
      } else {
        // If the name does not match, apply the 'invalid' class
        nameInput.classList.add('invalid');
        nameInput.classList.remove('valid');
        messageElement.textContent = 'Name does not match the records.'; // Display the error message
      }
    } catch (error) {
      console.error('Error validating name:', error);
    }
  }
});


document.addEventListener('DOMContentLoaded', async () => {
  const emailField = document.getElementById('email');
  const nameField = document.getElementById('name');
  const cgpaField = document.getElementById('cgpa');
  const registerNumberfield=document.getElementById('register-number');
  const departmentfield=document.getElementById('department');

  const email = emailField.value; // Assuming email is prefilled from the session/login

  try {
    // Fetch student details
    const response = await fetch('/fetchStudentDetails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error('Error fetching student details');
    }

    const { name, cgpa ,registerNumber,department} = await response.json();

    // Populate fields with retrieved data
    nameField.value = name;
    cgpaField.value = cgpa;
    registerNumberfield.value=registerNumber;
    departmentfield.value=department;
  } catch (error) {
    console.error('Error:', error);
  }
});

// Single form submission logic with all validations
// Single form submission logic with all validations
document.querySelector('form').addEventListener('submit', async function (e) {
  e.preventDefault();  // Prevent the form from submitting automatically

  const nameInput = document.getElementById('name');
  const description = document.getElementById('description').value.trim();
  const wordCount = description.split(/\s+/).length;

  // Check if the name input has the 'invalid' class
  if (nameInput.classList.contains('invalid')) {
    alert('Name entered does not match with the backend');
  } 
  // Check if description word count is within the valid range
  // else if (wordCount < 9 || wordCount > 250) {
  //   alert('Description must be between 9 and 250 words.');
  // } 
  else {
    // Proceed with form submission if validation passes
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to submit the form');  // Throw error if response is not OK
      }

      const result = await response.json();
      console.log('Form submitted successfully:', result);
      alert(result.message);  // Alert the success message returned by the backend
      window.location.href = '/success.html';  // Redirect after successful submission
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form. Please try again.');
    }
  }
});








