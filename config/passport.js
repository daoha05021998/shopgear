const passport = require('passport');
const User = require('../models/users.models');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

passport.use('local.register', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
}, (req, email, password, done) => {
    req.checkBody('password1', 'Password don\'t match').equals(req.body.password);
    console.log();
    req.checkBody('email', 'Invalid email').notEmpty().isEmail();
    req.checkBody('password', 'Invalid password').notEmpty().isLength({
        min: 6
    });
    req.checkBody('firstName', 'FirstName is require!');
    req.checkBody('lastName', 'FirstName is require!');
    req.checkBody('pnumber', 'FirstName is require!');
    req.checkBody('address', 'FirstName is require!');
    let errors = req.validationErrors();
    if (errors) {
        let messages = [];
        errors.forEach((error) => {
            messages.push(error.msg);
        });
        return done(null, false, req.flash('error', messages));
    }

    User.findOne({
        'email': email
    }, (err, user) => {
        if (err) {
            return done;
        }
        if (user) {
            return done(null, false, {
                message: 'Email is already in use!'
            })
        }
        let newUser = new User();
        newUser.email = email;
        newUser.password = newUser.encryptPassword(password);
        newUser.firstname = req.body.firstName;
        newUser.lastname = req.body.lastName;
        newUser.phone = req.body.pnumber;
        newUser.address = req.body.address;
        newUser.save((err, result) => {
            if (err) {
                return done(err);
            }
            return done(null, newUser);
        });
    });
}));


passport.use('local.login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
}, (req, email, password, done) => {

    req.checkBody('email', 'Invalid email').notEmpty().isEmail();
    req.checkBody('password', 'Invalid password').notEmpty();
    let errors = req.validationErrors();
    if (errors) {
        messages = [];
        errors.forEach((error) => {
            messages.push(error.msg);
        });
        return done(null, false, req.flash('error', messages));
    }

    User.findOne({
        'email': email
    }, async (err, user) => {
        if (!user) {
            return done(null, false, {
                message: 'No user found!'
            })
        }
        if (err) {
            return done;
        }
        if (await bcrypt.compareSync(password, user.password)) {
            return done(null, user);
        } else {
            return done(null, false, {
                message: 'Password is wrong!'
            })
        }

    });
}));