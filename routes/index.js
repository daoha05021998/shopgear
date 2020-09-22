const express = require('express');
const router = express.Router();
const csrf = require('csurf');

const controller = require('../controllers/index.controller')

const csrfProtection = csrf();
router.use(csrfProtection);

/* GET home page. */
router.get('/', controller.getHomePage);

router.get('/hotsale', controller.getHoteSale);

router.get('/post/:id', controller.getPost);

router.get('/search', controller.getSearch);

router.get('/add-to-cart/:id', isBlocked, controller.getAddToCart);

router.get('/shopping-cart', isBlocked, controller.getShoppingCart);

// add remove product
router.get('/reduce/:id', controller.getReduceProduct);

router.get('/remove/:id', controller.getRemoveProduct);

router.get('/add/:id', controller.getAddProduct);

router.get('/posts/:name', controller.getPosts);


module.exports = router;

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.oldUrl = req.url;
  res.redirect('users/login');
};

function isBlocked(req, res, next) {
  try {
    if (req.user.isLocked === false) {
      return next();
    }
  } catch (error) {
    return next();
  }
  res.status(400).send('Tài khoản của bạn bị khóa! Vui lòng liên hệ với QTV!');
};