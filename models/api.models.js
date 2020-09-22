const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    version : {
        type : Number
    },
    json : {
        type : String
    }
});

const Location = mongoose.model('location', locationSchema);
module.exports = Location;