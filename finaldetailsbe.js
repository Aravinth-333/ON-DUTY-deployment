const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const nodemailer=require('nodemailer')
const app = express(); // Initialize express app
app.use(cors()); // Apply cors middleware after app initialization
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const port = 3000;
// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/final_student_details')
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

  const studentDetailsDb = mongoose.createConnection('mongodb://localhost:27017/student_details');
studentDetailsDb.on('error', err => console.error('MongoDB connection error for student_details:', err));
studentDetailsDb.once('open', () => console.log('MongoDB connected successfully for student_details'));

// Define Schema
const studentSchema = new mongoose.Schema({
  name: String,
  registerNumber: String,
  department:String,
  year: String,
  email: String,
  cgpa: Number,
  eventType: String,
  internalType: String,     // New field for internal/external selection
  workshopType: String,     // New field for workshop type
  symposiumType: String,    // New field for symposium type
  otherWorkshopInput: String, // New field for custom workshop input
  otherSymposiumInput: String, // New field for custom symposium input
  workshopExternalType: String, // Workshop type for External
  symposiumExternalType: String, // Symposium type for External
  otherWorkshopExternalInput: String, // Custom workshop input for External
  otherSymposiumExternalInput: String, // Custom symposium input for External
  collegeName: String,
  startDate: Date,
  endDate: Date,
  file1: String,
  file2: String,
  description: String,
  
});
const Student = mongoose.model('Student', studentSchema);
const studentDetailsSchema = new mongoose.Schema({
  email: String,
  name: String,
  Cgpa:Number,
  RegisterNumber:Number,
  Department:String,
});
const StudentDetails = studentDetailsDb.model('twentymembers', studentDetailsSchema);
// Middleware to serve static files
app.use(express.static(path.join(__dirname)));
// Serve HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'gemini.html'));
});
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'aravinthsubbaiah3@gmail.com',
    pass:'mheu wpuw gzuz xiha'
  }
});
// Send Email Function

function removeEmptyFields(data) {
  const filteredData = {};
  for (const key in data) {
    // Check if the field is not empty, null, undefined, or an empty string
    if (data.hasOwnProperty(key) && data[key] !== '' && data[key] !== null && data[key] !== undefined) {
      filteredData[key] = data[key];
    }
  }
  return filteredData;
}
async function sendEmail(to, subject, text) {
  try {
    await transporter.sendMail({
      from: 'aravinthsubbaiah3@gmail.com',
      to: to,
      subject: subject,
      text: text
    });
    console.log('Email sent to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
// Handle form submissions
app.post('/register', async (req, res)  => {
  try {
    // Log the incoming data
    console.log('Received data:', req.body);
    // Extract form data
    const { 
      registerNumber,
      email, 
      eventType, 
      collegeName, 
      startDate, 
      endDate, 
      file1, 
      file2, 
      description, 
      year, 
      department,
      internalType,   
      workshopType,     // Workshop field
      symposiumType,    // Symposium field
      otherWorkshopInput, // Input for "Other" in Workshop
      otherSymposiumInput, // Input for "Other" in Symposium
      workshopExternalType,
      symposiumExternalType,
      otherWorkshopExternalInput,
      otherSymposiumExternalInput,
    } = req.body;

    
    console.log('Year:',year)

    // Validate required fields
    if (!email || !eventType || !collegeName || !startDate || !endDate || !year) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    
    // Fetch `name` and `cgpa` from `student_details` collection based on the email
    const studentData = await StudentDetails.findOne({ email });

    if (!studentData) {
      return res.status(400).json({ message: 'No student found for the provided email' });
    }

    const { name, Cgpa , RegisterNumber, Department} = studentData; // Auto-populate name and CGPA

    console.log('Auto-populating data:', { name, Cgpa });

    // Save to MongoDB
    const cleanedData = removeEmptyFields({
      name,
      registerNumber: RegisterNumber,
      department: Department,
      year,
      email,
      cgpa: Cgpa,
      eventType,
      collegeName,
      startDate,
      endDate,
      file1,
      file2,
      description,
      internalType,
      workshopType,
      symposiumType,
      otherWorkshopInput,
      otherSymposiumInput,
      workshopExternalType,
      symposiumExternalType,
      otherWorkshopExternalInput,
      otherSymposiumExternalInput,
    });
    const newStudent = new Student(cleanedData);
    await newStudent.save();
    
    // Synchronize with mentor backend
    await axios.post('http://localhost:3001/syncStudent', {
      name,
      registerNumber,
      department,
      year,
      cgpa:Cgpa,
      startDate,
      endDate,
      collegeName,
      file1,
      file2,
      email
    });
    res.status(200).json({ message: 'Form submitted successfully!' });
    // res.redirect('/success.html');
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).send('Error submitting form.');
  }
});

// Fetch student details by email
app.post('/fetchStudentDetails', async (req, res) => {
  try {
    const { email } = req.body;
    const studentData = await StudentDetails.findOne({ email });

    if (!studentData) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
       name: studentData.name, 
       cgpa: studentData.Cgpa,
       registerNumber:studentData.RegisterNumber,
       department:studentData.Department
       });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).send('Error fetching student details.');
  }
});

app.get('/getStudents', async (req, res) => {
  try {
    // Fetch students with only specific fields
    const students = await Student.find({}, 'name registerNumber cgpa startDate endDate collegeName file1 file2');
    console.log('Fetched students:', students); // Log data for debugging
    res.json(students); // Send the filtered data as JSON response
  } catch (error) {
    console.error('Error retrieving students:', error);
    res.status(500).send('Error retrieving students.');
  }
});
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
