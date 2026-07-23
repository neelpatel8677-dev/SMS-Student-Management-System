// 1. MODULE IMPORTS
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
require('dotenv').config();

// 2. APP INITIALIZATION
const app = express();
const PORT = process.env.PORT || 5000;

// 3. MIDDLEWARES
app.use(cors({ origin: "*" }));
app.use(express.json());

// 4. API ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/results', require('./routes/results'));
app.use('/api/faculty', require('./routes/faculty'));

// 5. STATIC FILES & FRONTEND PAGES
const frontendPath = path.join(__dirname, 'frontend');

// Home page redirect to login
app.get("/", (req, res) => {
    res.redirect("/login.html");
});

// Serve frontend static assets (CSS, JS, Images, HTML)
app.use(express.static(frontendPath));

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "OK", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// 6. CATCH-ALL ROUTE FOR FRONTEND HTML PAGES
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.endsWith('.html')) {
        res.sendFile(path.join(frontendPath, page), (err) => {
            if (err) {
                res.status(404).send("Page not found");
            }
        });
    } else {
        next();
    }
});

// 7. GLOBAL API 404 HANDLER
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: true, message: "API endpoint not found." });
});

// 8. DATABASE CONNECTION & SERVER START
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sms_db";

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });
/*
// 1. MODULE IMPORTS (Saare imports sabse upar)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
require('dotenv').config();

// 2. APP INITIALIZATION
const app = express();
const PORT = process.env.PORT || 5000;

// 3. MIDDLEWARES
app.use(cors({ origin: "*" }));
app.use(express.json());

// 4. API ROUTES (Pehle API hits check hone chahiye)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/results', require('./routes/results'));
app.use('/api/faculty', require('./routes/faculty')); // ✅ Added Faculty Route Management

// 5. STATIC FILES & FRONTEND PAGES
// Pehle Home page ka redirect chalega
app.get("/", (req, res) => {
    res.redirect("/login.html");
});

// Phir baki static files serve hongi
app.use(express.static("frontend"));

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "OK", db: "connected" });
});

// 6. CATCH-ALL ROUTE FOR HTML PAGES
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.endsWith('.html')) {
        res.sendFile(path.join(__dirname, 'frontend', page));
    } else {
        next();
    }
});

// 7. DATABASE CONNECTION & SERVER START
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => console.error('❌ DB Error:', err));
    */
