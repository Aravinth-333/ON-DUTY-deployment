// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');


const app = express();
const port = 3020;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/student_details')
  .then(() => console.log('Mongodb connected successfully'))
  .catch((err) => console.log("Mongodb not connected because of", err));

// Define schema and model
const studentSchema = new mongoose.Schema({
  Batch: String,
  'Name of the Student': String,
  'Email ID': String,
  Department: String,
  Section: String,
  Cgpa: Number
});

const Student = mongoose.model('twentymembers', studentSchema);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname)));
app.use(cors());

app.get('/',(req,res)=>{
  res.sendFile(path.join(__dirname,"formpage.html"));
});
// Route to fetch students based on Batch, Department, and Section
app.post('/fetchStudents', async (req, res) => {
  const { year, department, section } = req.body;
  
  try {
    const students = await Student.find({
      Batch: year,
      Department: department,
      Section: section
    });

    res.json(students);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to validate name
app.post('/validateName', async (req, res) => {
  const { name, year, department, section } = req.body;
  
  try {
    const student = await Student.findOne({
      'Name of the Student': name,
      Batch: year,
      Department: department,
      Section: section
    });
    
    if (student) {
      res.json({ valid: true });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.post('/submitForm', (req, res) => {
  // Handle form submission logic
  // Assuming you are saving form data to the database
  res.json({ success: true });
});
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
