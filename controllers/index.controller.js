const csrf = require('csurf');

const Productions = require('../models/products.models');
const Cart = require('../models/cart.models');
const Cmt = require('../models/comment.models');
const Slide = require('../models/slides.models');
const Post = require('../models/post.models');
const Category = require('../models/category.models');

const csrfProtection = csrf();

module.exports.getHomePage = async (req, res, next) => {
    res.locals.session = req.session;
    let role = await checkUser(req.user);
    let hots = await Productions.find({}).select('-post').where('type').ne('combo').sort('-sale').limit(4);
    let categories = await Category.find({});
    let products = [];
    for (const cate of categories) {
        let temp = await Productions.find({
            'type': cate.eName
        }).select('-post').limit(4);
        products = [...products, temp];
    }
    let slides = await Slide.find({
        'active': true
    });
    res.render('index', {
        title: 'ShopGear - Gear gaming chất lượng, giá tốt...',
        slides,
        hots,
        products,
        categories,
        role
    });
};

module.exports.getHoteSale = async (req, res, next) => {
    let role = await checkUser(req.user);

    // let page = parseInt(req.query.page) || 1;
    // let perPage = 12;
    // let pageTotal =  0;
    // let start = (page - 1) * perPage;
    // let end = page * perPage;

    let breadcrumbLink = [];
    let productions;
    let arrCompany = [];
    if (req.query.sort) {
        let sort = req.query.sort.toString();
        if (sort == 'low2hight') {
            productions = await Productions.find({}).select('-post').where('sale').gt(0).where('type').ne('combo').sort('price');
            for (const x of productions) {
                if (!arrCompany.includes(x.company)) {
                    arrCompany = [...arrCompany, x.company]
                    //console.log(x.company)
                }
            }
        } else {
            productions = await Productions.find({}).select('-post').where('sale').gt(0).where('type').ne('combo').sort('-price');
            for (const x of productions) {
                if (!arrCompany.includes(x.company)) {
                    arrCompany = [...arrCompany, x.company]
                    //console.log(x.company)
                }
            }
        }

    } else {
        productions = await Productions.find({}).select('-post').where('sale').gt(0).where('type').ne('combo');
        for (const x of productions) {
            if (!arrCompany.includes(x.company)) {
                arrCompany = [...arrCompany, x.company]
                //console.log(x.company)
            }
        }
        //pageTotal = Math.ceil(productions.length / perPage);
    }

    if (productions.length != 0) {
        breadcrumbLink[0] = `/`;
        breadcrumbLink[1] = `/hotsale`
        res.render('shop/result', {
            title: 'Sản phẩm giảm giá nhiều nhất',
            products: productions,
            //products: productions.slice(start, end),
            //page,
            //pageTotal,
            state: '',
            role: role,
            breadcrumbLink,
            arrCompany
            //varSearch: varSearch
        });
    } else {
        res.render('shop/result', {
            title: 'Xin lỗi!',
            products: productions,
            state: 'Xin lỗi không tìm thấy sản phẩm!',
            role: role,
            breadcrumbLink,
            arrCompany: []
            //varSearch: varSearch
        });
    }
};

module.exports.getPost = async (req, res, next) => {
    let role = await checkUser(req.user);
    let breadcrumbLink = [];
    let productId = req.params.id;
    let id;
    if (req.user) {
        id = req.user._id;
    } else {
        id = null;
    }
    let cmts = await Cmt.find({
        'productId': productId
    }).sort('-date');
    let product = await Productions.findById(productId, (err) => {
        if (err) {
            console.log(err);
            return res.redirect('/');
        }
    });
    let arr = product.post.img.split(',');
    for (let i = 0; i < arr.length; i++) {
        arr[i] = arr[i].trim();
    }
    let type = product.type;
    let products = await Productions.find({
        'type': type
    }).where('-post').where('_id').ne(productId).limit(4);
    breadcrumbLink[0] = `/`;
    breadcrumbLink[1] = `/search/?type=${type}`;
    breadcrumbLink[2] = `${product.name}`;
    res.render('shop/post', {
        title: product.name,
        role,
        product,
        products,
        arrImg: arr,
        cmts: cmts,
        id,
        breadcrumbLink,
        csrfToken: req.csrfToken()
    });
};

module.exports.getSearch = async (req, res, next) => {
    res.locals.session = await req.session;
    let role = await checkUser(req.user);
    let breadcrumbLink = [];
    let arrCompany = [];
    let varSearch = req.query.p;
    if (varSearch) {
        varSearch = varSearch.trim();
    }
    if (Number.isInteger(parseInt(varSearch))) {
        //console.log(parseInt(varSearch))
        let productions = await Productions.find({
            'price': varSearch
        }).select('-post');
        if (productions.length != 0) {
            res.render('shop/result', {
                title: 'Giá: ' + varSearch,
                products: productions,
                state: '',
                role: role,
                breadcrumbLink,
                arrCompany
                //varSearch: varSearch
            });
        } else {
            res.render('shop/result', {
                title: 'Kết quả',
                products: productions,
                state: 'Xin lỗi không tìm thấy sản phẩm!',
                role: role,
                breadcrumbLink,
                arrCompany
                //varSearch: varSearch
            });
        }
    } else {
        let productions;
        if (req.query.p) {
            let nameProduct = req.query.p.toString();
            productions = await Productions.find({
                'name': new RegExp(nameProduct, 'iu')
            }).select('-post');
        }
        if (req.query.type) {
            let typeProduct = req.query.type.toString();
            let sort = req.query.sort || null;
            //console.log(sort + 'soft');
            if (sort != null) {
                if (sort.toString() == 'low2hight') {
                    productions = await Productions.find({
                        'type': new RegExp(typeProduct, 'i')
                    }).select('-post').sort('price');

                    for (const x of productions) {
                        if (!arrCompany.includes(x.company)) {
                            arrCompany = [...arrCompany, x.company]
                            //console.log(x.company)
                        }
                    }

                    breadcrumbLink[0] = `/`;
                    breadcrumbLink[1] = `/search?type=${productions[0].type}`;
                } else {
                    productions = await Productions.find({
                        'type': new RegExp(typeProduct, 'i')
                    }).select('-post').sort('-price');

                    for (const x of productions) {
                        if (!arrCompany.includes(x.company)) {
                            arrCompany = [...arrCompany, x.company]
                            //console.log(x.company)
                        }
                    }

                    breadcrumbLink[0] = `/`;
                    breadcrumbLink[1] = `/search?type=${productions[0].type}`;
                }

            } else {
                productions = await Productions.find({
                    'type': new RegExp(typeProduct, 'i')
                }).select('-content');

                for (const x of productions) {
                    if (!arrCompany.includes(x.company)) {
                        arrCompany = [...arrCompany, x.company]
                        //console.log(x.company)
                    }
                }

                breadcrumbLink[0] = `/`;
                breadcrumbLink[1] = `/search?type=${productions[0].type}`
            }
        }
        if (productions.length != 0) {
            res.render('shop/result', {
                title: 'Sản phẩm',
                products: productions,
                state: '',
                role: role,
                breadcrumbLink,
                arrCompany
                //varSearch: varSearch
            });
        } else {
            res.render('shop/result', {
                title: 'Kết quả',
                products: productions,
                state: 'Xin lỗi không tìm thấy sản phẩm!',
                role: role,
                breadcrumbLink,
                arrCompany
                //varSearch: varSearch
            });
        }
    }
};

module.exports.getAddToCart = async (req, res, next) => {
    let productId = await req.params.id;
    //chu y
    await Productions.findById(productId, async (err, product) => {
        if (err) {
            console.log(err);
            return res.redirect('/');
        }
        let cart = await new Cart(req.session.cart ? req.session.cart : {});
        cart.add(product, product._id);
        req.session.cart = await cart;
        //res.redirect('/');
        res.json({
            'totalQty': cart.totalQty
        });
    }).select('-post');
};

module.exports.getShoppingCart = async (req, res, next) => {
    let role = await checkUser(req.user);
    if (!req.session.cart) {
        return res.render('shop/shopping-cart', {
            products: null,
            title: 'Giỏ hàng',
            role: role,
            csrfToken: req.csrfToken()
        });
    }
    let cart = new Cart(req.session.cart);
    let notification = await req.flash('noti');
    res.render('shop/shopping-cart', {
        products: cart.generateArray(),
        totalPrice: cart.totalPrice,
        title: 'Cart',
        notification: notification,
        role: role,
        csrfToken: req.csrfToken()
    })
};

module.exports.getReduceProduct = async function (req, res, next) {
    let productId = await req.params.id;
    let cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.reduceByOne(productId);
    req.session.cart = cart;
    res.redirect('/shopping-cart');
};

module.exports.getRemoveProduct = async function (req, res, next) {
    let productId = await req.params.id;
    let cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.removeItem(productId);
    req.session.cart = cart;
    res.redirect('/shopping-cart');
};

module.exports.getAddProduct = async function (req, res, next) {
    let productId = req.params.id;
    let cart = await new Cart(req.session.cart ? req.session.cart : {});
    cart.addItem(productId);
    req.session.cart = cart;
    res.redirect('/shopping-cart');
}

module.exports.getPosts = async (req, res, next) => {
    let name = await req.params.name;
    let role = await checkUser(req.user);
    let post = await Post.find({
        'link': name
    });
    //console.log(post)
    res.render('post', {
        title: post[0].title,
        post,
        role
    });
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
        if (reqUser.role === 'manager') {
            role = 'manager';
        }
    } catch (error) {
        role = 'user';
    }
    return role;
}