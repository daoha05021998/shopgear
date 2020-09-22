const mongoose = require('mongoose');

const cmtSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    name:{
        type: String,
        required: true
    },
    productId: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    date : {
        type : Date,
        default : Date.now
    }

});

const Cmt = mongoose.model('cmt', cmtSchema);
module.exports = Cmt;