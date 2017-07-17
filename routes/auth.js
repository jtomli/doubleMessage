var express = require('express');
var router = express.Router();
var models = require('../models/models');
var User = models.User;

module.exports = function(passport) {

  /***********FB Login **************/
  router.get('/auth/facebook', passport.authenticate('facebook'));
  router.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
      failureRedirect: '/login'
    }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/');
    }
  );

  /************ TWITTER login *************/
  router.get('/auth/twitter',
    passport.authenticate('twitter'));

  router.get('/auth/twitter/callback',
    passport.authenticate('twitter', {
      failureRedirect: '/login'
    }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/');
    });

  /************** PASSPORT routes **************/
  // GET home page
  router.get('/', function(req, res) {
    if (req.user) {
      res.redirect('/contacts');
    } else {
      res.redirect('/login');
    }
  });

  // GET signup page
  router.get('/signup', function(req, res) {
    res.render('signup');
  });

  // POST signup page
  router.post('/signup', function(req, res) {
    if (!req.body.username) {
      return res.render('signup', {
        error: "Username is required.",
        body: req.body
      })
    }

    if (req.body.phone.length !== 10) {
      return res.render('signup', {
        error: "Phone number must be 10 digits",
        body: req.body
      })
    }

    if (!req.body.password) {
      return res.render('signup', {
        error: "Password is required.",
        body: req.body
      })
    }
    if (req.body.password !== req.body.repeatPassword) {
      return res.render('signup', {
        error: "Passwords don't match.",
        body: req.body
      });
    }

    var u = new User({
      username: req.body.username,
      password: req.body.password,
      phone: req.body.phone
    });

    u.save(function(err, user) {
      if (err) {
        console.log(err);
        res.status(500).redirect('/signup');
        return;
      }
      console.log(user);
      res.redirect('/login');
    });
  });

  // GET Login page
  router.get('/login', function(req, res) {
    res.render('login');
  });

  // POST Login page
  router.post('/login', passport.authenticate('local', {
    successRedirect: '/contacts',
    failureRedirect: '/login'
  }));

  // GET Logout page
  router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/login');
  });

  return router;
}
