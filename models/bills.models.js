const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cart: {
        type: Object,
        required: true
    },
    feeShip: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    isPay: {
        type: Boolean,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    fname: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Bill = mongoose.model('bill', billSchema);
module.exports = Bill;