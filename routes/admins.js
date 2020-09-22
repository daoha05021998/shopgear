const express = require('express');
const router = express.Router();
const csrf = require('csurf');

const controller = require('../controllers/admin.controller');

const csrfProtection = csrf();
router.use(csrfProtection);

router.get('/', isLoggedIn, isStaffs, controller.getDashboard);

//user
router.get('/listUsers', isLoggedIn, isAdmin, controller.getListUsers);

router.get('/isLocked/:id', isLoggedIn, isAdmin, controller.getIsLocked);

router.get('/isUnlocked/:id', isLoggedIn, isAdmin, controller.getIsUnLocked);

//Staff
router.get('/listStaffs', isLoggedIn, isManager, controller.getListStaffs);

router.get('/addStaff', isLoggedIn, isManager, controller.getAddStaff);

router.post('/addStaff', isLoggedIn, isManager, controller.postAddStaff);

router.get('/editStaff/:idStaff', isLoggedIn, isManager, controller.getEditStaff);

router.post('/editStaff/:idStaff', isLoggedIn, isManager, controller.postEditStaff);

//Bills
router.get('/listBills', isLoggedIn, isStaffs, controller.getListBills);

router.get('/changeStateBill/:id', isLoggedIn, isStaffs, controller.getchangeStateBill);

router.get('/billDetail/:idBill', isLoggedIn, isStaffs, controller.getBillDetail);

router.post('/searchBill', isLoggedIn, isStaffs, controller.postSearchBill);

router.get('/listBillNotPay', isLoggedIn, isStaffs, controller.getListBillsNotPay);


//Products
router.get('/listProducts', isLoggedIn, isManager, controller.getListProducts);

router.get('/addProducts', isLoggedIn, isAdmin, controller.getAddProduct);

router.post('/addProducts', isLoggedIn, isAdmin, controller.postAddProduct);

router.get('/editProducts/:idProduct', isLoggedIn, isManager, controller.getEditProduct);

router.post('/editProducts/:idProduct', isLoggedIn, isManager, controller.postEditProduct);

router.get('/deleteProducts/:idProduct', isLoggedIn, isAdmin, controller.getDeleteProduct);

router.post('/searchProduct', isLoggedIn, isAdmin, controller.getSearchProduct);

//Slides
router.get('/listSlides', isLoggedIn, isStaffs, controller.getListSlide);

router.get('/addSlide', isLoggedIn, isStaffs, controller.getAddSlide);

router.post('/addSlide', isLoggedIn, isStaffs, controller.postAddSlide);

router.get('/slideActive/:id', isLoggedIn, isStaffs, controller.getSlideActive);

router.get('/editSlide/:id', isLoggedIn, isStaffs, controller.getEditSlide);

router.post('/editSlide/:id', isLoggedIn, isStaffs, controller.postEditSlide);

//dasdas Logs
router.get('/listLogs', isLoggedIn, isAdmin, controller.getListLogs);

//Posts
router.get('/listPosts', isLoggedIn, isStaffs, controller.getListPosts);

router.get('/addPost', isLoggedIn, isStaffs, controller.getAddPost);

router.post('/addPost', isLoggedIn, isStaffs, controller.postAddPost);

router.get('/editPost/:id', isLoggedIn, isStaffs, controller.getEditPost);

router.post('/editPost/:id', isLoggedIn, isStaffs, controller.postEditPost);

//Manager Products
router.get('/managerProducts', isLoggedIn, isManager, controller.getManagerProducts);

router.get('/addAmount/:id', isLoggedIn, isManager, controller.getAddAmount);

router.post('/addAmount/:id', isLoggedIn, isManager, controller.postAddAmount);

router.get('/statistical', isLoggedIn, isManager, controller.getStatistical);

//Category
router.get('/addCategory', isLoggedIn, isAdmin, controller.getAddCategory);

router.post('/addCategory', isLoggedIn, isAdmin, controller.postAddCategory);

router.get('/editCategory/:id', isLoggedIn, isAdmin, controller.getEditCategory);

router.post('/editCategory/:id', isLoggedIn, isAdmin, controller.postEditCategory);

router.get('/deleteCategory/:id', isLoggedIn, isAdmin, controller.getDeleteCategory);

router.get('/listCategories', isLoggedIn, isAdmin, controller.getListCategories);


module.exports = router;

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/users/login');
}

function isAdmin(req, res, next) {
  if (req.user.role === 'admin') {
    return next();
  }
  res.send('Access denied').status(403);
}

function isManager(req, res, next) {
  if (req.user.role === 'manager' || req.user.role === 'admin') {
    return next();
  }
  res.send('Access denied').status(403);
}

function isStaffs(req, res, next) {
  if (req.user.role === 'staff' || req.user.role === 'manager' || req.user.role === 'admin') {
    return next();
  }
  res.send('Access denied').status(403);
}