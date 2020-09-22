const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema({
    url : {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    active: {
        type: Boolean,
        default: true
    }
});

const Slide = mongoose.model('slides', slideSchema);
module.exports = Slide;