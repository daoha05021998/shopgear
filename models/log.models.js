const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    date: {
        type: Date,
        default: Date.now
    },
    log: {
        type: String,
        required: true
    }
});

const Log = mongoose.model('logs', logSchema);
module.exports = Log;