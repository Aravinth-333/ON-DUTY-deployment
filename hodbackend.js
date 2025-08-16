const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const port = 3003;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// MongoDB connection to the HOD database (for Student Data)
mongoose.connect('mongodb://localhost:27017/hod')
  .then(() => console.log('MongoDB connected successfully to HOD database'))
  .catch(err => console.error('MongoDB connection error to HOD database:', err));

// MongoDB connection to the validationreflection database (for Approved Emails)
async function connectToValidationReflection() {
  try {
    const validationDbConnection = await mongoose.createConnection('mongodb://localhost:27017/validatingreflection');
    console.log('MongoDB connected successfully to validationreflection database');
    return validationDbConnection;
  } catch (err) {
    console.error('MongoDB connection error to validationreflection database:', err);
  }
}

const validationDb = connectToValidationReflection(); // Establish connection for validationreflection

// Define Approved Email Schema and Model for storing approved emails in validationreflection DB
const approvedEmailSchema = new mongoose.Schema({
  email: String
});

const ApprovedEmail = mongoose.model('approvedemails', approvedEmailSchema, 'approvedemails'); // Collection in validationreflection DB

// Define New Approved Email Schema and Model for storing new approved emails in HOD DB
const newApprovedEmailSchema = new mongoose.Schema({
  email: String
});

const NewApprovedEmail = mongoose.model('newapprovedemails', newApprovedEmailSchema, 'newapprovedemails'); // Collection in HOD DB

// Define Student Schema and Model for HOD data
const studentSchema = new mongoose.Schema({
  name: String,
  registerNumber: String,
  startDate: Date,
  endDate: Date,
  collegeName: String,
  email: String,
  numberOfODTaken: { type: Number, default: 0 },
  status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' }, // Class Incharge status
});

const Student = mongoose.model('finalapprovalbyhod', studentSchema);

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'aravinthsubbaiah3@gmail.com',
    pass: 'mheu wpuw gzuz xiha'
  }
});

// Serve static files (e.g., HTML, CSS)
app.use(express.static(path.join(__dirname)));

// Route to serve the HOD page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'hod.html'));
});

// Login verification route
app.post('/login', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the email exists in the approvedemails collection
    const approvedEmail = await ApprovedEmail.findOne({ email });
    if (approvedEmail) {
      // If the email exists, redirect the user to 'certificates.html'
      res.redirect('/certificates.html');
    } else {
      // If the email does not exist, send an error message
      res.status(401).send('Email is not approved for access.');
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).send('Server error');
  }
});

// Fetch students with status 'approved' by the mentor and pending approval by the class incharge
app.get('/getAcceptedStudents', async (req, res) => {
  try {
    const students = await Student.find({ status: 'pending' });
    res.json(students);
  } catch (err) {
    res.status(500).send('Error fetching students');
  }
});

// Update student status based on class incharge's decision
app.post('/updateStudentStatus', async (req, res) => {
  const { id, status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).send('Invalid status');
  }

  try {
    const student = await Student.findByIdAndUpdate(id, { status }, { new: true });
    if (!student) {
      return res.status(404).send('Student not found');
    }

    if (status === 'approved') {
      // Generate email for the approved student
      const email = `${student.registerNumber}@rajalakshmi.edu.in`;
      try {
        // Save email in the approvedEmails collection (validationreflection database)
        const newApprovedEmail = new ApprovedEmail({ email });
        await newApprovedEmail.save();

        console.log('Email stored in the validationreflection database:', email);
      } catch (err) {
        console.error('Error storing email in the database:', err);
      }

      // Save email in the newapprovedemails collection (HOD database)
      try {
        const newApprovedEmailHod = new NewApprovedEmail({ email });
        await newApprovedEmailHod.save();

        console.log('Email stored in the HOD database (newapprovedemails):', email);
      } catch (err) {
        console.error('Error storing email in the HOD database (newapprovedemails):', err);
      }

      // Email sending logic
      const emailText = `<html>
        <body>
            <p style="font-size: 16px; line-height: 1.5;">
                The registration for on duty has been <strong>accepted</strong>. Here are the details:
            </p>
            <ul style="font-size: 16px; line-height: 1.5;">
                <li><strong>Name:</strong> ${student.name}</li>
                <li><strong>Register Number:</strong> ${student.registerNumber}</li>
                <li><strong>Event Start Date and Time:</strong> ${student.startDate.toLocaleString()}</li>
                <li><strong>Event End Date and Time:</strong> ${student.endDate.toLocaleString()}</li>
            </ul>
        </body>
    </html>`;

      // Send email to the student if an email exists
      if (student.email) {
        await sendEmail(student.email, `Student Registration ${status}`, emailText);
      }
    }

    res.json(student);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Function to send email
async function sendEmail(to, subject, htmlContent) {
  try {
    await transporter.sendMail({
      from: 'aravinthsubbaiah3@gmail.com',
      to,
      subject,
      html: htmlContent
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Synchronize students from mentor to class incharge collection (Optional if needed)
app.post('/syncStudent', async (req, res) => {
  try {
    console.log('Received data from class incharge:', req.body);
    const { _id, name, registerNumber, startDate, endDate, collegeName, status, email, numberOfODTaken } = req.body;
    if (!_id || !name || !registerNumber || !startDate || !endDate || !collegeName) {
      return res.status(400).send('Incomplete student data');
    }

    const studentData = {
      name,
      registerNumber,
      startDate,
      endDate,
      collegeName,
      email,
      numberOfODTaken: numberOfODTaken || 0,
      status: status || 'pending'
    };

    // Find if the student already exists
    const existingStudent = await Student.findById(_id);

    if (existingStudent) {
      // Update the existing student
      await Student.findByIdAndUpdate(_id, studentData, { new: true });
    } else {
      // Create a new student
      const newStudent = new Student({
        _id,
        ...studentData
      });

      await newStudent.save();
    }

    res.status(200).send('Student synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing student:', error.message);
    res.status(500).send('Error synchronizing student.');
  }
});

// Remove student from class incharge collection
app.post('/removeStudent', async (req, res) => {
  const { id } = req.body;
  try {
    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).send('Student not found');
    }
    res.json({ message: 'Student removed successfully' });
  } catch (err) {
    console.error('Error removing student:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
