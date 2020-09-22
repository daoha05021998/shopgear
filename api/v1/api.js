const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const Location = require('../../models/api.models')

const csrfProtection = csrf();
router.use(csrfProtection);

router.get('/v1/location',async (req, res, next)=>{
    let location = await Location.findOne({ "version" : "1" });
    let str = location.json;
    str = str.substring(1,str.length-1);
    res.send(str);
});

// router.post('/v1/location',async (req,res, next)=>{
//     let newVersion = new Location;
//     newVersion.version = 1;
//     newVersion.json = ``;
//     await newVersion.save();
// });

module.exports = router;