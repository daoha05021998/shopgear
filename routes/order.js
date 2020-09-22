const express = require('express');
const csrf = require('csurf');

const router = express.Router();
const controller = require('../controllers/order.controller')

const csrfProtection = csrf();
router.use(csrfProtection);

router.get('/checkout', isLoggedIn, isBlocked, controller.getCheckout);

router.post('/create_payment_url', isLoggedIn, isBlocked, controller.postCreatePayment);

router.get('/vnpay_return', controller.getVnPayReturn);

router.get('/vnpay_ipn', controller.getIpn);

router.get('/cod', isLoggedIn, isBlocked, controller.getCOD);

router.post('/cod', isLoggedIn, isBlocked, controller.postCOD);

router.get('/cancelBill/:id', isLoggedIn, controller.getCancelBill);

module.exports = router;

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.session.oldUrl = req.url;
    res.redirect('/users/login');
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

