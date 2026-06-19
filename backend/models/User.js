const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true // Ek email se ek hi account ban sake
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'student'],
        default: 'student' // Agar kuch na bheja jaye toh default student hoga
    },
    // Student-specific fields (Sirf tab bhari jayengi jab role 'student' hoga)
    rollNo: { type: String },
    course: { type: String },
    branch: { type: String },
    year: { type: Number }
}, { timestamps: true }); // Isse automatic 'createdAt' aur 'updatedAt' ban jayega

module.exports = mongoose.model('User', UserSchema);