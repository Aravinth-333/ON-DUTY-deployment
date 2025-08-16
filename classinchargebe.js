const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const app = express();
const port = 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.use(express.static(path.join(__dirname)))

app.get('/',(req,res) => {
    res.sendFile(path.join(__dirname,'classincharge.html'))
})
// MongoDB connection
mongoose.connect('mongodb://localhost:27017/classincharge')
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define Schema and Model
const studentSchema = new mongoose.Schema({
    name: String,
    registerNumber: String,
    startDate: Date,
    endDate: Date,
    collegeName: String,
    email: String,
    status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' }, // Class Incharge status
});

const Student = mongoose.model('ClassInchargeStudent', studentSchema);

// Serve static files (e.g., HTML, CSS)
app.use(express.static(__dirname));

// Fetch students with status 'approved' by the mentor and pending approval by the class incharge
app.get('/getAcceptedStudents', async (req, res) => {
    try {
        const students = await Student.find({ status: 'pending' }).select('-email');
        res.json(students);
    } catch (err) {
        console.error('Error fetching students:', err.message);
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
            const syncStudentToHod = {
                _id: student._id,
                name: student.name,
                registerNumber: student.registerNumber,
                startDate: student.startDate,
                endDate: student.endDate,
                collegeName: student.collegeName,
                email: student.email,
                status: 'pending' // Initial status for HOD
            };
            console.log('Syncing student to HOD:', syncStudentToHod); // Log for debugging
            await axios.post('http://localhost:3003/syncStudent', syncStudentToHod)
                .then(response => console.log('HOD Response:', response.data))
                .catch(error => {
                    console.error('Error syncing student to HOD:', error.response ? error.response.data : error.message);
                    return res.status(500).send('Error syncing student to HOD');
                });
        }
        res.json(student);
    } catch (err) {
        console.error('Error in updateStudentStatus:', err.message);
        res.status(500).send('Internal Server Error');
    }
});

// Synchronize students from mentor to class incharge collection (Optional if needed)
app.post('/syncStudent', async (req, res) => {
    try {
        const { _id, name, registerNumber, startDate, endDate, collegeName, status, email } = req.body;
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
            status: status || 'pending'
        };

        const existingStudent = await Student.findById(_id);

        if (existingStudent) {
            await Student.findByIdAndUpdate(_id, studentData, { new: true });
        } else {
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
