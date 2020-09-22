const csrf = require('csurf');

const User = require('../models/users.models');
const Bill = require('../models/bills.models');
const Productions = require('../models/products.models')
const Cart = require('../models/cart.models');
const Slide = require('../models/slides.models');
const Log = require('../models/log.models');
const Post = require('../models/post.models');
const locations = require('../public/javascripts/location');
const Category = require('../models/category.models');

const csrfProtection = csrf();

// Quản lý
module.exports.getDashboard = async (req, res, next) => {
    let name = await req.user.lastname;
    req.session.name = name;
    let countProducts = await Productions.find({}).countDocuments();
    let countUsers = await User.find({
        'role': 'user'
    }).countDocuments();
    let countBills = await Bill.find({
        'isPay': false
    }).countDocuments();
    let bills = await Bill.find({
        'isPay': true
    });
    let sumMoney = 0;
    for (x in bills) {
        sumMoney += parseInt(bills[x].cart.totalPrice) + parseInt(bills[x].feeShip);
    }
    //chart
    let cod = 0;
    let onlP = 0;
    let bill2types = await Bill.find({});
    for (x of bill2types) {
        if (x.type == 'cod') {
            cod++;
        } else {
            onlP++;
        }
    }
    //chart 2
    let time = new Date();
    let date = time.getUTCDate();
    let month = time.getUTCMonth();
    let year = time.getUTCFullYear();
    let dateUTC = new Date(Date.UTC(year, month, date));
    let nextDate = new Date(Date.UTC(year, month, parseInt(date) + 1));
    let billsChart = await Bill.find({}).where('date').gt(dateUTC.toString()).lt(nextDate.toString());
    let cart;
    let billss = [];
    let nameArr = [];
    let arrayQty = [];
    let arrObj = [];
    billsChart.forEach(function (bill) {
        cart = new Cart(bill.cart);
        bill.items = cart.generateArray();
        billss = [...billss, bill.items];
    });
    for (const element of billss) {
        for (const property in element) {
            if (!nameArr.includes(element[property].item.name)) {
                nameArr = [...nameArr, element[property].item.name]
                arrayQty = [...arrayQty, element[property].qty];
            } else {
                arrayQty[nameArr.indexOf(element[property].item.name)] += element[property].qty;
            }
        }
    }
    for (let i = 0; i < nameArr.length; i++) {
        arrObj = [...arrObj, {
            "name": nameArr[i],
            "qty": arrayQty[i]
        }]
    }
    arrObj.sort(function (a, b) {
        return b.qty - a.qty;
    });
    if (arrObj.length == 0) {
        arrObj = [{
            "name": null,
            "qty": null
        }, {
            "name": null,
            "qty": null
        }, {
            "name": null,
            "qty": null
        }, {
            "name": null,
            "qty": null
        }, {
            "name": null,
            "qty": null
        }, {
            "name": null,
            "qty": null
        }];
    }
    //console.log(arrObj)
    res.render('admin/dashboard', {
        csrfToken: req.csrfToken(),
        tab: 'dashboard',
        countProducts,
        countUsers,
        sumMoney,
        countBills,
        chart: {
            'cod': cod,
            'onlP': onlP,
            'arrObj': arrObj.slice(0, 6)
        }
    });
};

// Nhân viên - Người dùng
module.exports.getListUsers = async (req, res, next) => {
    let users = await User.find({
        'role': 'user'
    });
    res.render('admin/managerUsers/listUsers', {
        users: users,
        tab: 'users'
    });
};

module.exports.getListStaffs = async (req, res, next) => {
    let userRole = await checkUser(req.user);
    let role;
    if (userRole == 'manager') {
        role = 'staff';
    } else {
        role = await req.query.role || 'manager';
    }
    let staffs = await User.find({
        'role': role
    });
    let notification = await req.flash('notification');
    res.render('admin/managerUsers/listStaffs', {
        users: staffs,
        tab: 'staffs',
        role: role,
        notification: notification
    });
    notification = '';
};

module.exports.getAddStaff = async (req, res, next) => {
    let notification = req.flash('notification');
    let userRole = await checkUser(req.user);
    res.render('admin/managerUsers/addStaff', {
        tab: 'staffs',
        csrfToken: req.csrfToken(),
        notification,
        role: userRole
    });
    notification = '';
};

module.exports.postAddStaff = async (req, res, next) => {
    let email = req.body.email;
    let fname = req.body.firstName;
    let lname = req.body.lastName;
    let phone = req.body.pnumber;
    let address = req.body.address;
    let pass = req.body.password;
    let role = req.body.role;
    let user = await User.findOne({
        email: email
    });
    if (user) {
        await req.flash('notification', 'Tài khoản đã được sử dụng!');
        res.redirect('/admin/addStaff')
    } else {
        let staff = new User();
        staff.lastname = lname;
        staff.firstname = fname;
        staff.email = email;
        staff.password = staff.encryptPassword(pass);
        staff.phone = phone;
        staff.address = address;
        staff.role = role;
        await staff.save((err) => {
            if (err) {
                req.flash('notification', 'Có lỗi. Vui lòng thử lại!');
                res.redirect('/admin/addStaff');
            }
        });
        let log = new Log();
        log.name = req.user.lastname;
        log.user = req.user._id;
        log.log = log.name + ' đã thêm tài khoản ' + fname + ' ' + lname;
        await log.save();
        await req.flash('notification', 'Thêm nhân viên thành công!');
        res.redirect('/admin/listStaffs')
    }
};

module.exports.getEditStaff = async (req, res, next) => {
    let id = req.params.idStaff;
    let staff = await User.findById({
        '_id': id
    });
    let notification = req.flash('notification');
    res.render('admin/managerUsers/editStaff', {
        tab: 'staffs',
        staff: staff,
        csrfToken: req.csrfToken(),
        notification
    });
};

module.exports.postEditStaff = async (req, res, next) => {
    let id = req.params.idStaff;
    let email = req.body.email;
    let fname = req.body.firstName;
    let lname = req.body.lastName;
    let phone = req.body.pnumber;
    let address = req.body.address;
    await User.findByIdAndUpdate({
        '_id': id
    }, {
        'firstname': fname,
        'lastname': lname,
        'phone': phone,
        'address': address,
        'email': email
    }, {
        useFindAndModify: false
    }, (err) => {
        if (err) {
            req.flash('notification', 'Có lỗi xin thử lại!');
            res.redirect('/admin/editStaff' + id);
        }
    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã sửa tài khoản ' + fname + ' ' + lname;
    await log.save();
    await req.flash('notification', 'Sửa thông tin nhân viên thành công!');
    res.redirect('/admin/listStaffs');
};

// Hóa đơn
module.exports.getListBills = async (req, res, next) => {
    if (req.query.state) {
        let state = req.query.state;
        //console.log(state)
        await Bill.find({
            'state': state
        }, function (err, bills) {
            let billss = [];
            if (err) {
                return res.write('Error!');
            }
            let cart;
            bills.forEach(function (bill) {
                cart = new Cart(bill.cart);
                bill.items = cart.generateArray();
                billss = [...billss, bill.items];
            });

            res.render('admin/managerBills/listBills', {
                bills: bills,
                bill: billss,
                csrfToken: req.csrfToken(),
                tab: 'bills',
                date: null,
                state
            });
        }).sort('-date');
    } else if (req.query.date) {
        let date = await req.query.date;
        let arrDate = date.split('-');
        let dateUTC = new Date(Date.UTC(arrDate[0], arrDate[1] - 1, arrDate[2]));
        //console.log(date);
        let nextDate = new Date(Date.UTC(arrDate[0], arrDate[1] - 1, parseInt(arrDate[2]) + 1));
        //console.log(nextDate);
        await Bill.find({}, function (err, bills) {
                let billss = [];
                if (err) {
                    return res.write('Error!');
                }
                let cart;
                bills.forEach(function (bill) {
                    cart = new Cart(bill.cart);
                    bill.items = cart.generateArray();
                    billss = [...billss, bill.items];
                });

                res.render('admin/managerBills/listBills', {
                    bills: bills,
                    bill: billss,
                    date: date,
                    csrfToken: req.csrfToken(),
                    tab: 'bills',
                    state: ''
                });
            }).where('date').gt(dateUTC.toString()).lt(nextDate.toString())
            .sort('-date');
    } else {
        let today = new Date() || '';
        let date = today.toISOString().substring(0, 10);
        let nextDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), parseInt(today.getDate() + 1)));
        let todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        //bug thang 10 -12
        today = today.getFullYear() + '-' + 0 + parseInt(today.getMonth() + 1) + '-' + today.getDate();
        await Bill.find({}, function (err, bills) {
                let billss = [];
                if (err) {
                    return res.write('Error!');
                }
                let cart;
                bills.forEach(function (bill) {
                    cart = new Cart(bill.cart);
                    bill.items = cart.generateArray();
                    billss = [...billss, bill.items];
                });

                res.render('admin/managerBills/listBills', {
                    bills: bills,
                    bill: billss,
                    date,
                    csrfToken: req.csrfToken(),
                    tab: 'bills',
                    state: ''
                });
            }).where('date').gt(todayUTC.toString()).lt(nextDate.toString())
            .sort('-date');
    }

};

module.exports.getListBillsNotPay = async (req, res, next) => {
    await Bill.find({
        'isPay': false
    }, function (err, bills) {
        let billss = [];
        if (err) {
            return res.write('Error!');
        }
        let cart;
        bills.forEach(function (bill) {
            cart = new Cart(bill.cart);
            bill.items = cart.generateArray();
            billss = [...billss, bill.items];
        });
        res.render('admin/managerBills/listBills', {
            bills: bills,
            bill: billss,
            date: null,
            csrfToken: req.csrfToken(),
            tab: 'bills',
            state: ''
        });
    }).sort('-date');
};



module.exports.getchangeStateBill = async (req, res, next) => {
    let id = req.params.id;
    let bill = await Bill.findById({
        '_id': id
    });
    if (bill.state == 'Đang chuẩn bị hàng') {
        await Bill.findByIdAndUpdate({
            '_id': id
        }, {
            'state': 'Đang chuyển hàng'
        }, {
            useFindAndModify: false
        }, (err) => {
            if (err) {
                req.flash('notification', 'Có lỗi, Xin thử lại!');
                res.redirect('/admin/changeStateBill' + id);
            }
        });
        let log = new Log();
        log.name = req.user.lastname;
        log.user = req.user._id;
        log.log = log.name + '  xác nhận đã chuyển hàng có id là: ' + bill._id;
        await log.save();
        await req.flash('notification', 'Xác nhận chuyển hàng thành công!');
        res.redirect('/admin/billDetail/' + id);

    } else if (bill.state == 'Đang chuyển hàng') {
        await Bill.findByIdAndUpdate({
            '_id': id
        }, {
            'state': 'Đã nhận hàng',
            'isPay': true
        }, {
            useFindAndModify: false
        }, (err) => {
            if (err) {
                req.flash('notification', 'Có lỗi, Xin thử lại!');
                res.redirect('/admin/changeStateBill' + id);
            }
        })
        let log = new Log();
        log.name = req.user.lastname;
        log.user = req.user._id;
        log.log = log.name + ' Xác nhận đã nhận hàng hàng có id là: ' + bill._id;
        await log.save();
        await req.flash('notification', 'Xác nhận đã nhận hàng thành công!');
        res.redirect('/admin/billDetail/' + id);
    }
};

module.exports.getIsLocked = async (req, res, next) => {
    let id = req.params.id;
    await User.findByIdAndUpdate({
        '_id': id
    }, {
        'isLocked': true
    }, {
        useFindAndModify: false
    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã khóa tài khoản có id ' + id;
    await log.save();
    res.redirect('/admin/listUsers');
};

module.exports.getIsUnLocked = async (req, res, next) => {
    let id = req.params.id;
    await User.findByIdAndUpdate({
        '_id': id
    }, {
        'isLocked': false
    }, {
        useFindAndModify: false
    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã mở tài khoản có id ' + id;
    await log.save();
    res.redirect('/admin/listUsers');
};

module.exports.getListProducts = async (req, res, next) => {
    let type = await req.query.type || 'mouse';
    let categories = await Category.find({});
    let products = await Productions.find({
        'type': type
    }).select('-post');

    // let arrCompany = [];
    // for (const x of products){
    //     if (!arrCompany.includes(x.company)){
    //         arrCompany = [...arrCompany,x.company]
    //     }
    // }
    let notification = await req.flash('notification');
    res.render('admin/managerProducts/listProducts', {
        notification: notification,
        type: type,
        products: products,
        tab: 'products',
        categories,
        csrfToken: req.csrfToken(),
        //arrCompany
    });
    notification = '';
};

// Hóa đơn
module.exports.getBillDetail = async (req, res, next) => {
    let notification = await req.flash('notification');
    let idBill = req.params.idBill;
    let location = locations;
    await Bill.find({
        '_id': idBill
    }, function (err, bills) {
        let billss;
        if (err) {
            return res.write('Error!');
        }
        let cart;
        bills.forEach(function (bill) {
            cart = new Cart(bill.cart);
            let address = bill.address.split('-');
            if (address[0] && address[1]) {
                bill.address = address[2] + ', ' + location[address[0]].districts[address[1]].name + ', ' + location[address[0]].name;
            }
            billss = bill.items = cart.generateArray();
        });
        res.render('admin/managerBills/billDetail', {
            bill: billss,
            bills: bills,
            tab: 'bills',
            notification
        });
        notification = '';
    });
};

// Product
module.exports.getEditProduct = async (req, res, next) => {
    let id = req.params.idProduct;
    let notification = await req.flash('notification');
    let product = await Productions.findById({
        '_id': id
    });
    let categories = await Category.find({});
    res.render('admin/managerProducts/editProducts', {
        notification: notification,
        product: product,
        categories,
        csrfToken: req.csrfToken(),
        tab: 'products'
    });
    notification = '';
};

module.exports.postEditProduct = async (req, res, next) => {
    let id = req.params.idProduct;
    let type = req.body.type;
    let name = req.body.name;
    let price = req.body.price;
    let img = req.body.img;
    let sale = req.body.sale;
    //let amount = req.body.amount;
    let state = req.body.state;
    let company = req.body.company;
    //let published = req.body.published;

    let guarantee = req.body.pguarantee;
    let pimg = req.body.pimg;
    let content = req.body.pcontent;
    let info = req.body.pinfo;
    let led = req.body.pled;
    let pswitch = req.body.pswitch;
    await Productions.findByIdAndUpdate({
        '_id': id
    }, {
        'type': type,
        'name': name,
        'price': price,
        'img': img,
        'sale': sale,
        //'amount': amount,
        'state': state,
        'company': company,
        'post': {
            'guarantee': guarantee,
            'img': pimg,
            'content': content,
            'info': info,
            'led': led,
            'switch': pswitch,
        }
    }, {
        useFindAndModify: false
    }, (err) => {
        if (err) {
            req.flash('notification', 'Có lỗi xin thử lại!');
            res.redirect('/admin/editProducts' + id);
        }
    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã sửa sản phẩm ' + name;
    await log.save();
    await req.flash('notification', 'Sửa sản phẩm thành công!');
    res.redirect('/admin/listProducts?type=' + type);
};

module.exports.getDeleteProduct = async (req, res, next) => {
    let id = await req.params.idProduct;
    let product = await Productions.findById(id);
    await Productions.findOneAndDelete({
        '_id': id
    }, (err) => {
        if (err) {
            req.flash('notification', 'Có lỗi xin thử lại!');
            res.redirect('/admin/listProducts');
        }
    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã xóa sản phẩm có id' + product.name;
    await log.save();
    await req.flash('notification', 'Xóa thành công!');
    res.redirect('/admin/listProducts');
};

module.exports.getAddProduct = async (req, res, next) => {
    let notification = await req.flash('notification');
    let categories = await Category.find({});
    res.render('admin/managerProducts/addProducts', {
        csrfToken: req.csrfToken(),
        notification: notification,
        categories,
        tab: 'products'
    });
    notification = '';
};

module.exports.postAddProduct = async (req, res, next) => {
    let type = req.body.type;
    let name = req.body.name;
    let price = req.body.price;
    let img = req.body.img;
    let sale = req.body.sale;
    let amount = req.body.amount;
    let state = req.body.state;
    let published = req.body.published;
    let company = req.body.company;

    let guarantee = req.body.pguarantee;
    let pimg = req.body.pimg;
    let content = req.body.pcontent;
    let info = req.body.pinfo;
    let led = req.body.pled;
    let pswitch = req.body.pswitch;

    let product = new Productions();
    product.type = type.trim();
    product.name = name.trim();
    product.price = price;
    product.img = img.trim();
    product.sale = sale;
    product.amount = amount;
    product.published = published;
    product.state = state;
    product.company = company.trim();

    product.post.guarantee = guarantee;
    product.post.img = pimg;
    product.post.content = content;
    product.post.info = info;
    product.post.led = led;
    product.post.switch = pswitch;

    await product.save((err) => {
        if (err) {
            req.flash('notification', 'Có lỗi. Vui lòng thử lại!');
            res.redirect('/admin/addProducts')
        }

    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã thêm sản phẩm ' + name;
    await log.save();
    await req.flash('notification', 'Lưu thành công!');
    res.redirect('/admin/listProducts?type=' + type)
};

// Tìm kiếm sản phẩm
module.exports.getSearchProduct = async (req, res, next) => {
    let name = await req.body.searchProduct.toString();
    let type;
    let products = await Productions.find({
        'name': new RegExp(name, 'iu')
    }).select('-post');

    // let arrCompany = [];
    // for (const x of products){
    //     if (!arrCompany.includes(x.company)){
    //         arrCompany = [...arrCompany,x.company]
    //     }
    // }
    let notification = await req.flash('notification');
    if (products.length == 0) {
        type = null;
    } else {
        type = products[0].type
    }
    res.render('admin/managerProducts/listProducts', {
        notification: notification,
        type,
        products: products,
        tab: 'products',
        csrfToken: req.csrfToken(),
        categories: []
        //arrCompany
    });
    notification = '';
};

//Tìm kiếm hóa đơn
module.exports.postSearchBill = async (req, res, next) => {
    idBill = req.body.searchBill;
    let billss = [];
    await Bill.find({
        _id: idBill
    }, function (err, bills) {
        if (err) {
            return res.write('Error!');
        }
        let cart;
        bills.forEach(function (bill) {
            cart = new Cart(bill.cart);
            bill.items = cart.generateArray();
            billss = [...billss, bill.items];
        });

        res.render('admin/managerBills/listBills', {
            csrfToken: req.csrfToken(),
            bills: bills,
            bill: billss,
            date: '',
            tab: 'bills',
            state: ''
        });
    });
};

// Slide
module.exports.getListSlide = async (req, res, next) => {
    let slides = await Slide.find({});
    let notification = await req.flash('notification');
    res.render('admin/managerSlides/listSlides', {
        slides: slides,
        notification: notification,
        tab: 'slides'
    });
    notification = '';
};
module.exports.getAddSlide = async (req, res, next) => {
    let notification = await req.flash('notification');
    res.render('admin/managerSlides/addSlide', {
        csrfToken: req.csrfToken(),
        notification: notification,
        tab: 'slides'
    })
    notification = '';
};

module.exports.postAddSlide = async (req, res, next) => {
    let url = req.body.url;
    let link = req.body.link;
    let slide = new Slide();
    slide.url = url;
    slide.link = link;
    await slide.save((err) => {
        if (err) {
            req.flash('notification', 'Có lỗi. Vui lòng thử lại!');
            res.redirect('/admin/addSlide');
        }
    })
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã thêm slide mới ';
    await log.save();
    req.flash('notification', 'Thêm slide thành công!');
    res.redirect('/admin/listSlides');
};

module.exports.getSlideActive = async (req, res, next) => {
    let id = req.params.id;
    let slide = await Slide.find({
        '_id': id
    });
    if (slide[0].active) {
        await Slide.findByIdAndUpdate({
            '_id': id
        }, {
            active: false
        }, {
            useFindAndModify: false
        }, (err) => {
            if (err) {
                req.flash('notification', 'Có lỗi xin thử lại!');
                res.redirect('/admin/listSlides');
            }
        });
        let log = new Log();
        log.name = req.user.lastname;
        log.user = req.user._id;
        log.log = log.name + ' đã dừng slide có id' + id;
        await log.save();
        await req.flash('notification', 'Dừng hoạt động slide thành công!');
        res.redirect('/admin/listSlides');
    } else {
        await Slide.findByIdAndUpdate({
            '_id': id
        }, {
            active: true
        }, {
            useFindAndModify: false
        }, (err) => {
            if (err) {
                req.flash('notification', 'Có lỗi xin thử lại!');
                res.redirect('/admin/listSlides');
            }
        });
        let log = new Log();
        log.name = req.user.lastname;
        log.user = req.user._id;
        log.log = log.name + ' đã kích hoạt slide có id ' + id;
        await log.save();
        await req.flash('notification', 'Kích hoạt slide thành công!');
        res.redirect('/admin/listSlides');
    }
    notification = '';
};

module.exports.getEditSlide = async (req, res, next) => {
    let id = req.params.id;
    let slide = await Slide.find({
        '_id': id
    });
    let notification = await req.flash('notification');
    res.render('admin/managerSlides/editSlide', {
        csrfToken: req.csrfToken(),
        slide: slide,
        notification: notification,
        tab: 'slides'
    })
    notification = '';
};

module.exports.postEditSlide = async (req, res, next) => {
    let id = req.params.id;
    let url = req.body.url;
    let link = req.body.link;
    let stateActive = req.body.active;
    await Slide.findByIdAndUpdate({
        '_id': id
    }, {
        'url': url,
        'link': link,
        active: stateActive
    }, {
        useFindAndModify: false
    }, (err) => {
        if (err) {
            req.flash('notification', 'Có lỗi xin thử lại!');
            res.redirect('/admin/editSlide/' + id);
        }
    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã sửa slide có id ' + id;
    await log.save();
    await req.flash('notification', 'Cập nhật slide thành công!');
    res.redirect('/admin/listSlides');
};

// Log
module.exports.getListLogs = async (req, res, next) => {
    if (req.query.date) {
        let date = await req.query.date;
        //console.log(date)
        let arrDate = date.split('-');
        let dateUTC = new Date(Date.UTC(arrDate[0], arrDate[1] - 1, arrDate[2]));
        let nextDate = new Date(Date.UTC(arrDate[0], arrDate[1] - 1, parseInt(arrDate[2]) + 1));
        let logs = await Log.find({}).where('date').gt(dateUTC.toString()).lt(nextDate.toString())
            .sort('-date');
        let notification = '';
        res.render('admin/managerLogs/listLogs', {
            logs: logs,
            tab: 'logs',
            date: date,
            csrfToken: req.csrfToken(),
            notification
        });
    } else {
        let today = new Date() || '';
        let date = today.toISOString().substring(0, 10);
        let nextDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), parseInt(today.getDate() + 1)));
        let todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        //bug thang 10 -12
        today = today.getFullYear() + '-' + 0 + parseInt(today.getMonth() + 1) + '-' + today.getDate();
        //console.log(today)
        let logs = await Log.find({}).where('date').gt(todayUTC.toString()).lt(nextDate.toString())
            .sort('-date');;
        let notification = '';
        res.render('admin/managerLogs/listLogs', {
            logs: logs,
            tab: 'logs',
            date,
            csrfToken: req.csrfToken(),
            notification
        });
    }
}

// Bài viết
module.exports.getListPosts = async (req, res, next) => {
    let posts = await Post.find({});
    let notification = await req.flash('notification');
    res.render('admin/managerPosts/listPosts', {
        posts,
        tab: 'posts',
        csrfToken: req.csrfToken(),
        notification
    });
    notification = '';
};

module.exports.getAddPost = async (req, res, next) => {
    let notification = await req.flash('notification');
    res.render('admin/managerPosts/addPost', {
        tab: 'posts',
        csrfToken: req.csrfToken(),
        notification
    });
    notification = '';
};

module.exports.postAddPost = async (req, res, next) => {
    let user = req.user._id;
    let title = req.body.title;
    let name = req.user.lastname;
    let demo = req.body.demo;
    let link = req.body.link;
    let content = req.body.content;
    let post = new Post();
    post.name = name;
    post.title = title;
    post.user = user;
    post.link = link;
    post.demo = demo;
    post.content = content;
    await post.save((err) => {
        if (err) {
            req.flash('notification', 'Có lỗi, vui lòng thử lại!');
            res.redirect('/admin/addPost');
        }
    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã thêm bài viết mới tên: ' + title;
    await log.save();
    await req.flash('notification', 'Thêm bài viết thành công!');
    res.redirect('/admin/listPosts');
}

module.exports.getEditPost = async (req, res, next) => {
    let notification = '';
    let id = req.params.id;
    let post = await Post.findById(id);
    res.render('admin/managerPosts/editPost', {
        tab: 'posts',
        csrfToken: req.csrfToken(),
        post,
        notification
    });
};

module.exports.postEditPost = async (req, res, next) => {
    let id = req.params.id;
    let title = req.body.title;
    let demo = req.body.demo;
    let link = req.body.link;
    let content = req.body.content;
    await Post.findByIdAndUpdate({
        '_id': id
    }, {
        'title': title,
        'demo': demo,
        'link': link,
        'content': content
    }, {
        useFindAndModify: false
    }, (err) => {
        if (err) {
            req.flash('notification', 'Có lỗi xin thử lại!');
            res.redirect('/admin/editPost/' + id);
        }
    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã sửa bài viết: ' + title;
    await log.save();
    await req.flash('notification', 'Cập nhật bài viết thành công!');
    res.redirect('/admin/listPosts');
};

// Nhập hàng
module.exports.getManagerProducts = async (req, res, next) => {
    let notification = await req.flash('notification');
    let products = await Productions.find({}).where('amount').lt(30).limit(9).sort('-amount')
    res.render('admin/managerProducts/managerProducts', {
        tab: 'products',
        notification: notification,
        products: products
    });
};

module.exports.getAddAmount = async (req, res, next) => {
    let id = await req.params.id;
    let notification = await req.flash('notification');
    let product = await Productions.findById({
        '_id': id
    })
    res.render('admin/managerProducts/addAmount', {
        tab: 'products',
        notification: notification,
        product: product,
        csrfToken: req.csrfToken()
    })
};

module.exports.postAddAmount = async (req, res, next) => {
    let id = await req.params.id;
    let amount = await req.body.amount;
    //console.log(amount)
    let product = await Productions.findById({
        '_id': id
    }, (err, data) => {
        if (!err) {
            Productions.findByIdAndUpdate({
                '_id': id
            }, {
                'amount': data.amount + parseInt(amount),
            }, {
                useFindAndModify: false
            }, (err) => {
                if (err) {
                    req.flash('notification', 'Có lỗi xin thử lại!');
                    res.redirect('/admin/addAmount' + id);
                }
            });
        }
    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã nhập ' + product.name + ' số lượng: ' + amount;
    await log.save();
    await req.flash('notification', 'Nhập hàng thành công!');
    res.redirect('/admin/managerProducts');

};

// Thống kê
module.exports.getStatistical = async (req, res, next) => {
    let time = new Date();
    let date = time.getUTCDate();
    let month = time.getUTCMonth();
    let year = time.getUTCFullYear();
    let dateUTC = new Date(Date.UTC(year, month, date));
    let nextDate = new Date(Date.UTC(year, month, parseInt(date) + 1));
    let firstDateOfMonth = new Date(Date.UTC(year, month, 0));
    if (!req.query.p) {
        req.query.p = 'allProductsOnDay'
    }

    if (req.query.p == 'allProductsOnDay') {
        let billsChart = await Bill.find({}).where('date').gt(dateUTC.toString()).lt(nextDate.toString());
        let cart;
        let billss = [];
        let nameArr = [];
        let arrayQty = [];
        let arrObj = [];
        billsChart.forEach(function (bill) {
            cart = new Cart(bill.cart);
            bill.items = cart.generateArray();
            billss = [...billss, bill.items];
        });
        for (const element of billss) {
            for (const property in element) {
                if (!nameArr.includes(element[property].item.name)) {
                    nameArr = [...nameArr, element[property].item.name]
                    arrayQty = [...arrayQty, element[property].qty];
                } else {
                    arrayQty[nameArr.indexOf(element[property].item.name)] += element[property].qty;
                }
            }
        }
        for (let i = 0; i < nameArr.length; i++) {
            arrObj = [...arrObj, {
                "name": nameArr[i],
                "qty": arrayQty[i]
            }]
        }
        arrObj.sort(function (a, b) {
            return b.qty - a.qty;
        });
        let notification = '';
        res.render('admin/statistical/statistical', {
            array: arrObj,
            inventorys: [],
            tab: 'statistical',
            csrfToken: req.csrfToken(),
            notification,
            selected: 'allProductsOnDay'
        });
    }
    if (req.query.p == "allProductsOnMonth") {
        let billsChart = await Bill.find({}).where('date').gte(firstDateOfMonth.toString()).lte(nextDate.toString());
        let cart;
        let billss = [];
        let nameArr = [];
        let arrayQty = [];
        let arrObj = [];
        billsChart.forEach(function (bill) {
            cart = new Cart(bill.cart);
            bill.items = cart.generateArray();
            billss = [...billss, bill.items];
        });
        for (const element of billss) {
            for (const property in element) {
                if (!nameArr.includes(element[property].item.name)) {
                    nameArr = [...nameArr, element[property].item.name]
                    arrayQty = [...arrayQty, element[property].qty];
                } else {
                    arrayQty[nameArr.indexOf(element[property].item.name)] += element[property].qty;
                }
            }
        }
        for (let i = 0; i < nameArr.length; i++) {
            arrObj = [...arrObj, {
                "name": nameArr[i],
                "qty": arrayQty[i]
            }]
        }
        arrObj.sort(function (a, b) {
            return b.qty - a.qty;
        });
        let inventorys = await Productions.find({ "sold" : 0 }).limit(6);
        let notification = '';
        res.render('admin/statistical/statistical', {
            array: arrObj,
            inventorys,
            tab: 'statistical',
            csrfToken: req.csrfToken(),
            notification,
            selected: 'allProductsOnMonth'
        });
    }

    if (req.query.p == "allBillsOnDay") {
        let sumMoney = 0;
        let location = locations;
        let bills = await Bill.find({}).where('date').gt(dateUTC.toString()).lt(nextDate.toString());
        for (x in bills) {
            sumMoney += parseInt(bills[x].cart.totalPrice) + parseInt(bills[x].feeShip);
            //console.log(sumMoney)
        }
        let num = bills.length;
        bills.forEach(function (bill) {
            let address = bill.address.split('-');
            if (address[0] && address[1]) {
                bill.address = address[2] + ', ' + location[address[0]].districts[address[1]].name + ', ' + location[address[0]].name;
                bill.time = location[address[0]].districts[address[1]].time;
            }
        });
        let notification = '';
        res.render('admin/statistical/billStatistical', {
            bills,
            num,
            tab: 'statistical',
            csrfToken: req.csrfToken(),
            notification,
            type: 'Day',
            sumMoney,
            selected: 'allBillsOnDay'
        });
    }
    if (req.query.p == "allBillsOnMonth") {
        let sumMoney = 0;
        let location = locations;
        let bills = await Bill.find({}).where('date').gt(firstDateOfMonth.toString()).lt(nextDate.toString());
        for (x in bills) {
            sumMoney += parseInt(bills[x].cart.totalPrice) + parseInt(bills[x].feeShip);
        }
        let num = bills.length;
        bills.forEach(function (bill) {
            let address = bill.address.split('-');
            if (address[0] && address[1]) {
                bill.address = address[2] + ', ' + location[address[0]].districts[address[1]].name + ', ' + location[address[0]].name;
                bill.time = location[address[0]].districts[address[1]].time;
            }
        });
        let notification = '';
        res.render('admin/statistical/billStatistical', {
            bills,
            num,
            tab: 'statistical',
            csrfToken: req.csrfToken(),
            notification,
            type: 'Month',
            sumMoney,
            selected: 'allBillsOnMonth'
        });
    }
};

//Category
module.exports.getAddCategory = async (req, res, next) => {
    let notification = await req.flash('notification');
    res.render('admin/managerCategory/addCategory', {
        notification,
        csrfToken: req.csrfToken(),
        tab: 'category'
    });
    notification = '';
};

module.exports.postAddCategory = async (req, res, next) => {
    let category = new Category();
    category.name = req.body.name.toString().trim();
    category.eName = req.body.eName.toString().trim();
    category.img = req.body.img.toString().trim();
    category.save();
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã thêm danh mục ' + category.name;
    await log.save();
    await req.flash('notification', 'Thêm danh mục mới thành công!');
    res.redirect('/admin/listCategories');
};

module.exports.getEditCategory = async (req, res, next) => {
    let notification = await req.flash('notification');
    let id = req.params.id;
    let category = await Category.findById(id);
    res.render('admin/managerCategory/editCategory', {
        notification,
        category,
        csrfToken: req.csrfToken(),
        tab: 'category'
    });
    notification = '';
};

module.exports.postEditCategory = async (req, res, next) => {
    let id = req.params.id;
    let name = req.body.name.toString().trim();
    let eName = req.body.eName.toString().trim();
    let img = req.body.img.toString().trim();
    await Category.findByIdAndUpdate({
        '_id': id
    }, {
        'name': name,
        'eName': eName,
        'img': img
    }, {
        useFindAndModify: false
    }, (err) => {
        if (err) {
            req.flash('notification', 'Có lỗi xin thử lại!');
            res.redirect('/admin/editCategory/' + id);
        }
    });
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã sửa danh mục ' + name;
    await log.save();
    await req.flash('notification', 'Sửa danh mục thành công!');
    res.redirect('/admin/listCategories');
};

module.exports.getDeleteCategory = async (req, res, next) => {
    let id = req.params.id;
    let category = await Category.findById(id);
    await Category.findByIdAndDelete(id);
    let log = new Log();
    log.name = req.user.lastname;
    log.user = req.user._id;
    log.log = log.name + ' đã xóa danh mục ' + category.name;
    await log.save();
    await req.flash('notification', 'Xóa danh mục thành công!');
    res.redirect('/admin/listCategories');
};

module.exports.getListCategories = async (req, res, next) => {
    let notification = await req.flash('notification');
    let categories = await Category.find({});
    res.render('admin/managerCategory/listCategories', {
        notification,
        categories,
        tab: 'category'
    });
    notification = '';
};

// Kiểm tra role user 
function checkUser(reqUser) {
    let role = '';
    try {
        if (reqUser.role === 'admin') {
            role = 'admin';
        }
        if (reqUser.role === 'staff') {
            role = 'staff';
        }
        if (reqUser.role === 'manager') {
            role = 'manager';
        }
    } catch (error) {
        role = 'user';
    }
    return role;
}