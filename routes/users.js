const express = require('express');
const router = express.Router();
const passport = require('passport');
const csrf = require('csurf');

const Log = require('../models/log.models');
const controller = require('../controllers/users.controller');

const csrfProtection = csrf();
router.use(csrfProtection);

router.get('/profile', isLoggedIn, controller.getProfile);

router.post('/comment/:id', isLoggedIn, controller.postComment);

router.get('/deleteComment/:id/:idProduct', isLoggedIn, controller.getDeleteComment);

router.post('/editComment/:id/:idProduct', isLoggedIn, controller.postEditComment);

router.get('/changeInformation', isLoggedIn, controller.getChangeInfo);

router.post('/changeInformation/:id', isLoggedIn, controller.postChangeInfo);

router.get('/changePassword', isLoggedIn, controller.getChangePassword);

router.post('/changePassword', isLoggedIn, controller.postChangePassword);

router.get('/logout', isLoggedIn, controller.getLogout);



/* GET users listing. */
router.get('/login', controller.getLogin);

//
router.post('/login', passport.authenticate('local.login', {
  failureRedirect: '/users/login',
  failureFlash: true
}), async (req, res, next) => {
  //console.log(req.user.role);
  if (req.user.role === 'admin' || req.user.role === 'staff' || req.user.role === 'manager') {
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã đăng nhập ';
    await log.save();
    res.redirect('/admin');
  }
  if (req.session.oldUrl) {
    let oldUrl;
    if (req.session.oldUrl == '/checkout') {
      oldUrl = '/order/checkout';
    } else {
      oldUrl = req.session.oldUrl;
    }
    req.session.oldUrl = null;
    res.redirect(oldUrl);
  } else {
    res.redirect('/');
  }
});

//router.post('/login', controller.postLogin);

router.get('/register', controller.getRegister);

router.post('/register', controller.postRegister);

router.use('/', notLoggedIn, (req, res, next) => {
  next();
});

module.exports = router;

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/users/login');
}

function notLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}