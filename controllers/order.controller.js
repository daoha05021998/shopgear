const dateFormat = require('dateformat');
const csrf = require('csurf');
const config = require('config');
const querystring = require('qs');
const sha256 = require('sha256');
const nodemailer = require('nodemailer');

const Bill = require('../models/bills.models');
const Cart = require('../models/cart.models');
const Productions = require('../models/products.models');

const csrfProtection = csrf();

module.exports.getCheckout = (req, res, next) => {
    res.render('order/order', {
        csrfToken: req.csrfToken()
    });
};

module.exports.postCreatePayment = async (req, res, next) => {
    let cart = new Cart(await req.session.cart);
    let feeShip;
    if (cart.totalPrice < 500000) {
        feeShip = 40000;
    } else {
        feeShip = 0;
    }
    let ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

    let tmnCode = config.get('vnp_TmnCode');
    let secretKey = config.get('vnp_HashSecret');
    let vnpUrl = config.get('vnp_Url');
    let returnUrl = config.get('vnp_ReturnUrl');

    let date = new Date();
    let desc = 'Thanh toan don hang thoi gian: ' + dateFormat(date, 'yyyy-mm-dd HH:mm:ss');

    let createDate = dateFormat(date, 'yyyymmddHHmmss');
    let orderId = dateFormat(date, 'HHmmss');
    let amount = req.session.cart.totalPrice + feeShip;
    let bankCode = ''; //req.body.bankCode;

    let orderInfo = desc;
    let orderType = 'billpayment'; //req.body.orderType;
    let locale = 'vn';
    if (locale === null || locale === '') {
        locale = 'vn';
    }
    let currCode = 'VND';
    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    // vnp_Params['vnp_Merchant'] = ''
    vnp_Params['vnp_Locale'] = locale;
    vnp_Params['vnp_CurrCode'] = currCode;
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = orderInfo;
    vnp_Params['vnp_OrderType'] = orderType;
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    if (bankCode !== null && bankCode !== '') {
        vnp_Params['vnp_BankCode'] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);
    let signData = secretKey + querystring.stringify(vnp_Params, {
        encode: false
    });

    let secureHash = sha256(signData);
    vnp_Params['vnp_SecureHashType'] = 'SHA256';
    vnp_Params['vnp_SecureHash'] = secureHash;
    vnpUrl += '?' + querystring.stringify(vnp_Params, {
        encode: true
    });
    //Neu muon dung Redirect thi dong dong ben duoi
    // res.status(200).json({
    //     code: '00',
    //     data: vnpUrl
    // })
    //Neu muon dung Redirect thi mo dong ben duoi va dong dong ben tren
    let address = req.body.city + '-' + req.body.subCity + '-' + req.body.address;
    let fname = req.body.fullName;
    let phone = req.body.pnumber;
    req.session.bill = {
        address: address,
        name: fname,
        phone: phone
    };
    res.redirect(vnpUrl);
};

module.exports.getVnPayReturn = async (req, res, next) => {
    let vnp_Params = await req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    let tmnCode = config.get('vnp_TmnCode');
    let secretKey = config.get('vnp_HashSecret');

    let signData = secretKey + querystring.stringify(vnp_Params, {
        encode: false
    });

    let checkSum = sha256(signData);
    if (secureHash === checkSum) {
        //Kiem tra xem du lieu trong db co hop le hay khong va thong bao ket qua
        let code = vnp_Params['vnp_ResponseCode'];
        //console.log(code);
        if (code == '00') {
            if (!req.session.cart) {
                console.log('loi');
                return res.redirect('/shopping-cart');
            } else {
                let cart = new Cart(await req.session.cart);
                if (cart.totalPrice < 500000) {
                    feeShip = 40000;
                } else {
                    feeShip = 0;
                }

                let arrCart = cart.generateArray();
                let arrId = [];
                let arrQty = [];
                for (let i = 0; i < arrCart.length; i++) {
                    arrId = [...arrId, arrCart[i].item._id];
                    arrQty = [...arrQty, arrCart[i].qty];
                }
                for (let i = 0; i < arrCart.length; i++) {
                    let temp = await Productions.findById(arrId[i]);
                    await Productions.findByIdAndUpdate({
                        _id: arrId[i]
                    }, {
                        sold: temp.sold + Number.parseInt(arrQty[i])
                    }, {
                        useFindAndModify: false
                    });
                }

                let bill = await new Bill({
                    user: req.user,
                    cart: cart,
                    feeShip: feeShip,
                    type: 'onlinePayment',
                    state: 'Đang chuẩn bị hàng',
                    address: req.session.bill.address,
                    fname: req.session.bill.name,
                    phone: req.session.bill.phone,
                    isPay: true
                });
                await bill.save((err, result) => {
                    if (err) {
                        console.log(err);
                    } else {
                        req.session.bill = bill._id;
                        req.session.cart = null;
                        req.session.bill = null;
                        sendEmail(req.user.email);
                        req.flash('noti', 'Giao dịch thành công!');
                        res.redirect('/users/profile');
                    }
                });
            }

        } else {
            req.flash('noti', 'Giao dịch bị hủy!');
            res.redirect('/shopping-cart');
        }
    } else {
        // res.render('order/success', {
        //     code: '97'
        // })
        req.flash('noti', 'Có lỗi, vui lòng thử lại!');
        res.redirect('/users/profile');

    }
};

module.exports.getIpn = async (req, res, next) => {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let secretKey = config.get('vnp_HashSecret');
    let signData = secretKey + querystring.stringify(vnp_Params, {
        encode: false
    });

    let checkSum = sha256(signData);

    if (secureHash === checkSum) {
        let orderId = vnp_Params['vnp_TxnRef'];
        let rspCode = vnp_Params['vnp_ResponseCode'];

        //Kiem tra du lieu co hop le khong, cap nhat trang thai don hang va gui ket qua cho VNPAY theo dinh dang duoi
        res.status(200).json({
            RspCode: '00',
            Message: 'success'
        })
    } else {
        res.status(200).json({
            RspCode: '97',
            Message: 'Fail checksum'
        })
    }
};

module.exports.getCOD = (req, res, next) => {
    res.render('order/cod', {
        csrfToken: req.csrfToken()
    });
};

module.exports.postCOD = async (req, res, next) => {
    if (!req.session.cart) {
        console.log('loi');
        return res.redirect('/shopping-cart');
    } else {
        let cart = new Cart(await req.session.cart);
        if (cart.totalPrice < 500000) {
            feeShip = 40000;
        } else {
            feeShip = 0;
        }

        let arrCart = cart.generateArray();
        let arrId = [];
        let arrQty = [];
        for (let i = 0; i < arrCart.length; i++) {
            arrId = [...arrId, arrCart[i].item._id];
            arrQty = [...arrQty, arrCart[i].qty];
        }
        for (let i = 0; i < arrCart.length; i++) {
            let temp = await Productions.findById(arrId[i]);
            if (temp.amount - temp.sold - arrQty[i] < 0) {
                req.flash('noti', 'Xin lỗi! Hết hàng!');
                res.redirect('/users/profile');
                break;
            } else {
                await Productions.findByIdAndUpdate({
                    _id: arrId[i]
                }, {
                    sold: temp.sold + Number.parseInt(arrQty[i])
                }, {
                    useFindAndModify: false
                });
            }

        }
        let bill = new Bill({
            user: req.user,
            cart: cart,
            feeShip: feeShip,
            type: 'cod',
            state: 'Đang chuẩn bị hàng',
            address: req.body.city + '-' + req.body.subCity + '-' + req.body.address,
            fname: req.body.fullName,
            phone: req.body.pnumber,
            isPay: false
        });
        await bill.save((err, result) => {
            if (err) {
                console.log(err);
            } else {
                req.session.bill = bill._id;
                req.session.cart = null;
                sendEmail(req.user.email);
                req.flash('noti', 'Đặt hàng thành công!');
                res.redirect('/users/profile');
            }
        });
    }
};

module.exports.getCancelBill = async (req, res, next)=>{
    let id = await req.params.id;
    let bill = await Bill.findById(id);
    time = new Date(`${bill.date}`)
    now = Date.now();
    if(now - time.getTime() <= (15 * 60 * 1000) && bill.user == req.user.id){
      await Bill.findByIdAndDelete(id);
      req.flash('noti', 'Hủy đơn hàng thành công!');
      res.redirect('/users/profile');
    }else{
        req.flash('noti', 'Hủy đơn hàng thất bại do quá thời gian quy định!');
        res.redirect('/users/profile');
    }
  };

const sortObject = (o) => {
    let sorted = {},
        key, a = [];

    for (key in o) {
        if (o.hasOwnProperty(key)) {
            a.push(key);
        }
    }

    a.sort();

    for (key = 0; key < a.length; key++) {
        sorted[a[key]] = o[a[key]];
    }
    return sorted;
}

function sendEmail(email){
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'testdoanutt@gmail.com',
          pass: 'Daohakien'
        }
      });
      let mess = `Xin cảm ơn bạn đã mua hàng tại website chúng tôi!
      Bạn đã đặt hàng thành công sản phẩm của chúng tôi.
      Hàng sẽ chuyển đến địa chỉ bạn cung cấp trong thời gian ngắn nhất!
      Mong được chào đón bạn trong một ngày không xa!
      
      Manager/Quản lý 
      Tel: +098 888 8888
      Email: testdoanutt@gmail.com
      `
      let mailOptions = {
        from: 'testdoanutt@gmail.com',
        to: email.toString(),
        subject: 'CẢM ƠN BẠN',
        text: mess
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
}