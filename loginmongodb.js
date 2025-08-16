const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
const port = 3039;

app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.connect('mongodb://127.0.0.1:27017/validatingreflection');
const db = mongoose.connection;
db.once('open', () => {
    console.log('MongoDB connection successfully established');
});
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
const userSchema = new mongoose.Schema({
    Email: String,
    Password: String,
    otp: String,
    otpExpires: Date,
});

const Users = mongoose.model('signupdata', userSchema);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'aravinthsubbaiah3@gmail.com',
        pass: 'mheu wpuw gzuz xiha'
    }
});

// function validateEmail(email) {
//     const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return re.test(email.toLowerCase());
// }
function validateEmail(email) {
        const re = /^\d{9}@rajalakshmi\.edu\.in$/;
        return re.test(String(email).toLowerCase());
    }

    function validatePassword(password) {
        const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return re.test(password);
    }

    // Connect to hod database (for newapprovedemails collection)
const hodDb = mongoose.createConnection('mongodb://127.0.0.1:27017/hod');
const newApprovedEmailSchema = new mongoose.Schema({ email: String });
const NewApprovedEmail = hodDb.model('newapprovedemails', newApprovedEmailSchema, 'newapprovedemails');

// Route to serve login1.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login1.html'));
});
//updated login for certificates page
// Route to handle login
app.post('/login', async (req, res) => {
    try {
        const { Email, Password } = req.body;

        // Check if the email and password match any record in the Users collection
        const user = await Users.findOne({ Email, Password });

        if (user) {
            // If the user exists, check if the email is in 'newapprovedemails'
            const newApprovedEmail = await NewApprovedEmail.findOne({ email: Email });

            if (newApprovedEmail) {
                return res.json({ redirectTo: '/certification.html' });
            } else {
                return res.json({ redirectTo: '/gemini.html' });
            }
        } else {
            // If no matching user is found, send a JSON error response with 401 status
            return res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});



app.post('/check-email', async (req, res) => {
    try {
        const { Email } = req.body;

        // Check if email already exists
        const user = await Users.findOne({ Email });

        if (user) {
            res.send('Email already registered.');
        } else {
            res.send('Email not registered.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// POST route to send OTP
app.post('/send-otp', async (req, res) => {
    try {
        const { Email, Password } = req.body;

        if (!validateEmail(Email)) {
            return res.status(400).send('Invalid email format.');
        }

        if (!validatePassword(Password)) {
            return res.status(400).send('Password must be at least 8 characters long, contain at least one uppercase letter, one number, and one special character.');
        }

        // Check if email already exists
        const existingUser = await Users.findOne({ Email });
        if (existingUser) {
            return res.send('Email already registered. You can directly log in.');
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 120000; // OTP expires in 1 hour

        await Users.create({ Email, Password, otp, otpExpires });

        const mailOptions = {
           from: 'aravinthsubbaiah3@gmail.com',
            to: Email,
            subject: 'Your OTP Code And User Credentials',
            text: `Your OTP code is ${otp}. It will expire in two minutes.\n\nYour Email is ${Email}.\nYour password is ${Password}.`
        }

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error sending OTP');
            }
            res.send('OTP sent successfully');
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// POST route to verify OTP
app.post('/verify-otp', async (req, res) => {
    try {
        const { Email, otp } = req.body;

        // Fetch user and check OTP
        const user = await Users.findOne({
            Email,
            otp,
            otpExpires: { $gt: Date.now() } // Ensure OTP has not expired
        });

        if (!user) {
            return res.status(400).send('Invalid or expired OTP.');
        }

        // Optionally clear OTP after successful verification
        await Users.findOneAndUpdate(
            { Email },
            { otp: null, otpExpires: null }
        );

        res.send('OTP verified successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Final signup route to store password
app.post('/final-signup', async (req, res) => {
    try {
        const { Email, Password } = req.body;

        if (!validatePassword(Password)) {
            return res.status(400).send('Password must be at least 8 characters long, contain at least one uppercase letter, one number, and one special character.');
        }
        
        await Users.findOneAndUpdate(
            { Email },
            { Password }
        );

        res.send('Signup successful.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.listen(port, () => {
    console.log(`Server connected on port ${port}`);
});
