const csrf = require('csurf');
const passport = require('passport');
const bcrypt = require('bcrypt');

const User = require('../models/users.models');
const Cart = require('../models/cart.models');
const Bill = require('../models/bills.models');
const Cmt = require('../models/comment.models');
const Log = require('../models/log.models');
const locations = require('../public/javascripts/location');

const csrfProtection = csrf();

module.exports.getProfile = async (req, res, next) => {
    let messages = await req.flash('noti');
    let role = await checkUser(req.user);
    let location = locations;
    await Bill.find({
        'user': req.user.id
    }, function (err, bills) {
        if (err) {
            return res.write('Error!');
        }
        let cart;
        let billss = [];
        bills.forEach(function (bill) {
            cart = new Cart(bill.cart);
            let address = bill.address.split('-');
            if (address[0] && address[1]) {
                bill.address = address[2] + ', ' + location[address[0]].districts[address[1]].name + ', ' + location[address[0]].name;
                bill.time = location[address[0]].districts[address[1]].time;
            }
            bill.items = cart.generateArray();
            billss = [...billss, bill.items];
        });
        res.render('user/profile', {
            bills: bills,
            bill: billss,
            notification: messages,
            role
        });
    }).sort('-date');
};

module.exports.postComment = async (req, res, next) => {
    let comment = new Cmt();
    let id = req.params.id;
    comment.userId = req.user.id;
    comment.name = req.user.firstname + req.user.lastname;
    comment.productId = id;
    comment.content = req.body.comment;
    await comment.save();
    res.redirect('/post/' + id);
};

module.exports.getDeleteComment = async (req, res, next) => {
    let id = req.params.id;
    let idProduct = req.params.idProduct;
    await Cmt.findByIdAndDelete({
        _id: id
    }, (err) => {
        if (err) {
            req.flash('notification', 'Có lỗi xin thử lại!');
            res.redirect(`/post/${idProduct}`);
        }
    });
    await req.flash('notification', 'Xóa thành công!');
    res.redirect(`/post/${idProduct}`);
};

module.exports.postEditComment = async (req, res, next)=>{
    let id = req.params.id;
    let idProduct = req.params.idProduct;
    let content = req.body.content;
    await Cmt.findByIdAndUpdate({
        '_id': id
    }, {
        'content': content
    }, {
        useFindAndModify: false
    }, (err) => {
        if (err) {
            req.flash('notification', 'Có lỗi, Xin thử lại!');
            res.redirect(`/post/${idProduct}`);
        }
    });
    res.sendStatus(200);
}

module.exports.getChangeInfo = (req, res, next) => {
    let user = req.user;
    res.render('user/changeInf', {
        csrfToken: req.csrfToken(),
        user: user
    });
};
module.exports.postChangeInfo = async (req, res, next) => {
    let id = req.params.id;
    let fname = req.body.firstname;
    let lname = req.body.lastname;
    let phone = req.body.pnumber;
    let address = req.body.address;
    await User.findByIdAndUpdate({
        '_id': id
    }, {
        'firstname': fname,
        'lastname': lname,
        'phone': phone,
        'address': address
    }, {
        useFindAndModify: false
    })
    res.redirect('/users/profile')
};

module.exports.getChangePassword = (req, res, next) => {
    res.render('user/changePW', {
        csrfToken: req.csrfToken()
    });
};

module.exports.postChangePassword = async (req, res, next) => {
    if (await bcrypt.compareSync(req.body.password, req.user.password)) {
        await User.findByIdAndUpdate({
            '_id': req.user.id
        }, {
            'password': bcrypt.hashSync(req.body.newpassword, 10)
        }, {
            useFindAndModify: false
        });
        req.logout();
        res.redirect('/users/login');
    } else {
        console.log('Sai');
    }

};

module.exports.getLogout = async (req, res, next) => {
    req.session.cart = await null;
    await req.logout();
    await res.redirect('/');
};

module.exports.getLogin = async (req, res) => {
    let messages = await req.flash('error');
    res.render('user/login', {
        csrfToken: req.csrfToken(),
        messages: messages,
        hasErrors: messages.length > 0,
        title: 'Login'
    });
};

// module.exports.postLogin = passport.authenticate('local.login', {
//     failureRedirect: '/users/login',
//     failureFlash: true
// }), async (req, res, next) => {
//     console.log(req.user.role);
//     if (req.user.role === 'admin' || req.user.role === 'staff' || req.user.role === 'manager') {
//         let log = new Log();
//         log.name = req.user.lastname;
//         log.user = req.user._id;
//         log.log = log.name + ' đã đăng nhập ';
//         await log.save();
//         res.redirect('/admin');
//     }
//     if (req.session.oldUrl) {
//         let oldUrl;
//         if (req.session.oldUrl == '/checkout') {
//             oldUrl = '/order/checkout';
//         } else {
//             oldUrl = req.session.oldUrl;
//         }
//         req.session.oldUrl = null;
//         res.redirect(oldUrl);
//     } else {
//         res.redirect('/');
//     }
// };

module.exports.getRegister = async (req, res) => {
    let messages = await req.flash('error');
    res.render('user/register', {
        csrfToken: req.csrfToken(),
        messages: messages,
        hasErrors: messages.length > 0,
        title: 'Register'
    });
};

module.exports.postRegister = passport.authenticate('local.register', {
    failureRedirect: '/users/register',
    failureFlash: true
}), async (req, res, next) => {
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
};

function checkUser(reqUser) {
    let role = '';
    try {
        if (reqUser.role === 'admin') {
            role = 'admin';
        }
        if (reqUser.role === 'staff') {
            role = 'staff';
        }
    } catch (error) {
        role = 'user';
    }
    return role;
}