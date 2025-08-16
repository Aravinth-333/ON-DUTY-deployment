const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors=require('cors')
const app = express();
const port = 3059;

app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors({
    origin:'http://localhost:3059'
}))
mongoose.connect('mongodb://127.0.0.1:27017/facultylogin');
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

function validateEmail(email) {
    const classInChargePattern = /^[a-zA-Z]+(?:\.[a-zA-Z]+)?@rajalakshmi\.edu\.in$/;
    const hodPattern = /^hod\.[a-zA-Z]+@rajalakshmi\.edu\.in$/;

    console.log(`Validating Email: ${email}`);
    const isClassInCharge = classInChargePattern.test(email.toLowerCase());
    const isHod = hodPattern.test(email.toLowerCase());

    console.log(`  Class-in-Charge Regex: ${isClassInCharge}`);
    console.log(`  HOD Regex: ${isHod}`);

    if (isHod) {
        return 'hod';
    } else if (isClassInCharge) {
        return 'classInCharge';
    } else {
        return 'invalid';
    }
}

    function validatePassword(password) {
        const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return re.test(password);
    }


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'facultylogin.html'));
});

app.post('/login', async (req, res) => {
    try {
        const { Email, Password } = req.body;
        const user = await Users.findOne({ Email, Password });

        if (user) {
            const emailType = validateEmail(Email);
            let redirectUrl;
            if (emailType === 'classInCharge') {
                redirectUrl = 'http://localhost:3001'; // URL for Class-in-Charge
            } else if (emailType === 'hod') {
                redirectUrl = 'http://localhost:3003'; // URL for HOD
            } else {
                return res.status(400).json({ message: 'Invalid email type' });
            }

            console.log(`Redirecting to: ${redirectUrl}`); // Log the redirect URL
            return res.json({ message: 'Login successful', redirect: redirectUrl });
        } else {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
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

        const emailType = validateEmail(Email);

        if (emailType === 'invalid') {
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
