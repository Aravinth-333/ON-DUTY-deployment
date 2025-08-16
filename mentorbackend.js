const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer=require('nodemailer')
const app = express();
const port = 3001;
const axios=require('axios');
const path = require('path');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.use(express.static(path.join(__dirname)))

app.get('/',(req,res)=>{
  res.sendFile(path.join(__dirname,'mentor.html'))
})

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/mentortable')
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));
app.use(express.static(__dirname));
// Certificate submission schema
const fileSubmissionSchema = new mongoose.Schema({
  email: { type: String, required: true },
  file1: { type: String, required: true },
  file2: { type: String, required: true },
  status: { type: String, enum: ['accepted', 'rejected', 'pending'], default: 'pending' },
});

const FileSubmission = mongoose.model('filesubmission', fileSubmissionSchema);

// Endpoint to handle certificate submission
app.post('/submitCertificates', async (req, res) => {
  const { email,file1, file2 } = req.body;

  if (!email || !file1 || !file2) {
    return res.status(400).send('Missing required fields: email, file1, or file2');
  }

  try {
    const newSubmission = new FileSubmission({
      email,
      file1,
      file2,
    });
    await newSubmission.save();
    res.status(200).send('Certificates submitted successfully.');
  } catch (err) {
    res.status(500).send('Error submitting certificates.');
  }
});

// Endpoint to fetch all pending certificates for review
app.get('/getPendingCertificates', async (req, res) => {
  try {
    const submissions = await FileSubmission.find({ status: 'pending' });
    res.json(submissions);
  } catch (err) {
    res.status(500).send('Error fetching pending certificates.');
  }
});

// Endpoint to update certificate status
app.post('/updateCertificateStatus', async (req, res) => {
  const { id, status } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).send('Invalid status.');
  }

  try {
    const submission = await FileSubmission.findByIdAndUpdate(id, { status }, { new: true });

    if (!submission) {
      return res.status(404).send('Certificate submission not found.');
    }

    res.status(200).send(`Certificate status updated to ${status}.`);
  } catch (err) {
    res.status(500).send('Error updating certificate status.');
  }
});

app.get('/certificates', (req, res) => {
  res.sendFile(path.join(__dirname, 'certificates.html'));
});

// Schema and Model
const studentSchema = new mongoose.Schema({
  name: String,
  department: { type: String, required: true }, // Add department field
  year: { type: String, required: true }, // Add year field
  registerNumber: String,
  cgpa: Number,
  startDate: Date,
  endDate: Date,
  collegeName: String,
  file1: String,
  file2: String,
  status: { type: String, enum: ['accepted', 'rejected', 'pending'], default: 'pending' },
  email:String,
  numberOfODTaken:{type:Number,default:0},
});

const Student = mongoose.model('finalrequestbymentor', studentSchema);
// const transporter = nodemailer.createTransport({
//   service: 'Gmail',
//   auth: {
//     user: 'aravinthsubbaiah3@gmail.com', // Ensure this environment variable is set
//     pass:'mheu wpuw gzuz xiha'   // Ensure this environment variable is set
//   }
// });

// async function sendEmail(to, subject, text) {
//   try {
//     await transporter.sendMail({
//       from: 'aravinthsubbaiah3@gmail.com',
//       to: to,
//       subject: subject,
//       text: text
//     });
//     console.log('Email sent to:', to);
//   } catch (error) {
//     console.error('Error sending email:', error);
//   }
// }
app.post('/updateStudentStatus', async (req, res) => {
  const { id, status, name, registerNumber, startDate, endDate, collegeName,department,year } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).send('Invalid status');
  }

  try {
    // Update student with additional fields
    const student = await Student.findByIdAndUpdate(id, {
      status,
      name,
      registerNumber,
      startDate,
      endDate,
      collegeName,
      department,
      year,
    }, { new: true });

    if (!student) {
      return res.status(404).send('Student not found');
    }
    
    if (status === 'accepted') {
      // Send student data to classincharge backend
      await axios.post('http://localhost:3003/syncStudent', {
        _id: student._id,
        name: student.name,
        registerNumber: student.registerNumber,
        cgpa: student.cgpa,
        startDate: student.startDate,
        endDate: student.endDate,
        collegeName: student.collegeName,
        file1: student.file1,
        file2: student.file2,
        email: student.email,
        numberOfODTaken: student.numberOfODTaken 
      });
      
      // Remove student from mentor database
      // await Student.findByIdAndDelete(id);

      console.log('Student synchronized with Hod');
    } else if (status === 'rejected') {
      await sendEmail(student.email, 'Registration Rejected', 'Your registration for on-duty request is rejected by mentor.');
    }

    res.json(student);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

    // Sync updated student data to class incharge backend
//     await fetch('http://localhost:3002/syncStudent', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         _id: student._id,
//         name: student.name,
//         registerNumber: student.registerNumber,
//         startDate: student.startDate,
//         endDate: student.endDate,
//         collegeName: student.collegeName,
//         status: 'pending' // Ensure that status is pending for class incharge review
//       }),
//     });

//     res.json(student);
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });
// Add this endpoint to handle synchronization

// app.get('/',(req,res)=>{
// res.sendFile(path.join(__dirname,"mentor.html"));
// });
// Get students

// Add this endpoint to handle synchronization

// Get accepted students for class incharge
// app.get('/getAcceptedStudents', async (req, res) => {
//   try {
//       const acceptedStudents = await Student.find({ status: 'accepted' }, 'name registerNumber startDate endDate collegeName'); // Only fetch specific fields
//       res.json(acceptedStudents);
//   } catch (err) {
//       res.status(500).send(err.message);
//   }
// });
// Fetch students with status 'pending' by the class incharge
app.get('/getAcceptedStudents', async (req, res) => {
  try {
      const students = await Student.find({ status: 'pending' }); // Status for class incharge review
      res.json(students);
  } catch (err) {
      res.status(500).send(err.message);
  }
});


// Route to increment the number of OD taken for a student

// mentorbackend.js

// app.post('/incrementOdCount', async (req, res) => {
//   const { registerNumber } = req.body;
//   console.log(`Received request to update OD count for email: ${email}, new count: ${numberOfODTaken}`);
//   try {
//     const student = await Student.findOneAndUpdate(
//       { email: email },
//       { numberOfODTaken: numberOfODTaken },
//       { new: true }
//     );

//     if (!student) {
//       console.log(`Student not found in mentor database for email: ${email}`);
//       return res.status(404).send('Student not found in mentor database');
//     }

//     console.log(`OD count updated for student with email: ${email}, new count: ${numberOfODTaken}`);
//     res.status(200).send(`OD count updated for student: ${student.name}`);
//   } catch (err) {
//     console.error('Error updating OD count:', err.message);
//     res.status(500).send('Error updating OD count.');
//   }
// });




app.post('/incrementOdCount', async (req, res) => {
  const { registerNumber } = req.body;

  try {
    const student = await Student.findOne({ registerNumber });

    if (!student) {
      return res.status(404).send('Student not found');
    }

    student.numberOfODTaken += 1;  // Increment OD count
    await student.save();

    res.status(200).send(`OD count updated to ${student.numberOfODTaken}`);
  } catch (err) {
    res.status(500).send('Error updating OD count.');
  }
});


app.get('/getStudents', async (req, res) => {
  try {
    const students = await Student.find().sort({ numberOfODTaken: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/syncStudent', async (req, res) => {
  try {
    const { name, registerNumber, cgpa, startDate, endDate, collegeName, file1, file2,email,department,year} = req.body;
    
    const newStudent = new Student({
      name,
      department,
      year,
      registerNumber,
      cgpa,
      startDate,
      endDate,
      collegeName,
      file1,
      file2,
      email,
      status: 'pending',
    });

    await newStudent.save();
    res.status(200).send('Student synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing student:', error);
    res.status(500).send('Error synchronizing student.');
  }
});




// app.post('/syncStudent', async (req, res) => {
//   try {
//     const { name, registerNumber, cgpa, startDate, endDate, collegeName, file1, file2, email } = req.body;

//     const student = await Student.findOneAndUpdate(
//       { email: email },
//       { name, registerNumber, cgpa, startDate, endDate, collegeName, file1, file2, status: 'pending' },
//       { upsert: true, new: true }
//     );

//     res.status(200).send('Student synchronized successfully.');
//   } catch (error) {
//     console.error('Error synchronizing student:', error);
//     res.status(500).send('Error synchronizing student.');
//   }
// });

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});