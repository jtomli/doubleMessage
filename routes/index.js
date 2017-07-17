var express = require('express');
var router = express.Router();
var Contact = require("../models/models").Contact;
var Message = require('../models/models').Message;
var User = require('../models/models').User;

// TWILIO
// Do not update your tokens here. Do it in env.sh
var accountSid = process.env.TWILIO_SID; // Your Account SID from www.twilio.com/console
var authToken = process.env.TWILIO_AUTH_TOKEN; // Your Auth Token from www.twilio.com/console
var fromNumber = process.env.MY_TWILIO_NUMBER; // Your custom Twilio number
var twilio = require('twilio');
var twilioClient = new twilio(accountSid, authToken);

var Twitter = require('twitter');
var twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

/************** Webhook ***************/
router.post('/messages/receive', function(req, res) {
  var from = req.body.From.substring(2) + "";
  var to = req.body.To.substring(2) + "";
  console.log(typeof from);
  User.findOne({
    phone: to
  }, function(err, user) {
    Contact.findOne({
      phone: from
    }, function(error, contact) {
      var newMessage = new Message({
        created: new Date(),
        content: req.body.Body,
        user: user._id,
        contact: contact._id,
        status: "received",
        from: from
      });
      newMessage.save(function(errorr, savedMsg) {
        if (errorr) {
          console.log("error saving");
        } else {
          console.log("success saving");
        }
      });
    })
  });
});

/*********** WALL **********/
router.use(function(req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  } else {
    return next();
  }
});

/******** contacts.hbs routes *************/
/* GET contacts page */
router.get('/contacts', function(req, res) {
  Contact.find({
    owner: req.user._id
  }, function(err, contacts) {
    res.render('contacts', {
      user: req.user,
      contacts: contacts,
      social: req.user.facebookId || req.user.twitterId,
      twitter: req.user.twitterId,
      followers: req.user.followers
    });
  });
});

// GET new contact
router.get('/contacts/new', function(req, res) {
  res.render('editContact', {
    new: true
  });
});

// POST new contact
router.post('/contacts/new', function(req, res) {
  var newContact = new Contact({
    name: req.body.name,
    phone: req.body.phone,
    owner: req.user._id
  });
  newContact.save(function(err, savedContact) {
    if (err) {
      console.log("error saving contact")
    } else {
      res.redirect('/contacts');
    }
  })
});

// GET edit a contact
router.get('/contacts/:id', function(req, res) {
  var id = req.params.id;
  Contact.findById(id, function(err, contact) {
    res.render('editContact', {
      contact: contact
    });
  });
});

// POST edit a contact
router.post('/contacts/:id', function(req, res) {
  var id = req.params.id;
  Contact.findById(id, function(err, contact) {
    contact.name = req.body.name;
    contact.phone = req.body.phone;

    contact.save(function(err, updatedContact) {
      if (err) {
        console.log("error updating contact");
      } else {
        res.redirect('/contacts');
      }
    });
  });
});

/*********** Messaging Routes ***********/
// GET all messages
router.get('/messages', function(req, res) {
  var id = req.user._id;
  Message.find({
    user: id
  }).populate('contact').exec(function(err, allMessages) {
    if (allMessages.length > 0) {
      allMessages.sort(function(a, b) {
        if (a.created < b.created) {
          return -1;
        } else if (a.created > b.created) {
          return 1;
        } else {
          return 0;
        }
      });
      var contact = allMessages[0].contact.name;
      res.render('messages', {
        messages: allMessages,
        contact: contact,
        all: true
      });
    }
  });
});
// GET all messages to contact
router.get('/messages/:contactId', function(req, res) {
  var userId = req.user._id;
  var contactId = req.params.contactId;
  Message.find({
    contact: contactId,
    user: userId
  }).populate('contact').exec(function(err, allMessages) {
    if (allMessages.length > 0) {
      allMessages.sort(function(a, b) {
        if (a.created < b.created) {
          return -1;
        } else if (a.created > b.created) {
          return 1;
        } else {
          return 0;
        }
      });
      var contact = allMessages[0].contact.name;
      res.render('messages', {
        messages: allMessages,
        contact: contact
      });
    }
  });
});

// GET newMessage form
router.get('/messages/send/:contactId', function(req, res) {
  var id = req.params.contactId;
  Contact.findById(id, function(err, contact) {
    res.render('newMessage', {
      name: contact.name,
      phone: contact.phone,
      type: "SMS",
      id: contact._id,
      sms: true
    });
  });
});

// POST newMessage form
router.post('/messages/send/:contactId', function(req, res) {
  var id = req.params.contactId;
  Contact.findById(id).populate('owner').exec(function(err, contact) {
    var data = {
      body: req.body.content,
      to: '+1' + contact.phone,
      from: '+1' + contact.owner.phone
    };
    twilioClient.messages.create(data, function(err, msg) {
      console.log(err, msg);
      if (err) {
        console.log("error sending message")
      } else {
        var newMessage = new Message({
          created: new Date(),
          content: req.body.content,
          user: req.user._id,
          contact: id,
          status: "sent"
        });
        newMessage.save(function(error, savedMsg) {
          if (error) {
            console.log("error saving message")
          } else {
            res.redirect(`/messages/${id}`)
          }
        });
      }
    });
  });
});

/******* twitter ***************/
router.get('/twitter/import', function(req, res) {
  twitterClient.get('followers/list.json?count=200', function(error, response) {
    User.findOneAndUpdate({
      _id: req.user._id
    }, {
      followers: response.users
    }, function(err, user) {
      user.save(function(err, savedUser) {
        res.redirect('/contacts');
      });
    });
  });
});

router.get('/twitter/messages', function(req, res) {
  var allMessages = [];
  twitterClient.get('/direct_messages', function(error, response) {
    response.forEach(function(dm) {
      allMessages.push({
        sender: dm.sender_screen_name,
        img: dm.sender.profile_image_url,
        recipient: dm.recipient_screen_name,
        time: dm.created_at,
        content: dm.text
      });
    });
    twitterClient.get('/direct_messages/sent', function(error, responseSent) {
      responseSent.forEach(function(dm) {
        allMessages.push({
          sender: dm.sender_screen_name,
          img: dm.sender.profile_image_url,
          recipient: dm.recipient_screen_name,
          time: dm.created_at,
          content: dm.text
        });
      });
    });

    allMessages.sort(function(a, b) {
      if (a.time < b.time) {
        return -1;
      } else if (a.time > b.time) {
        return 1;
      } else {
        return 0;
      }
    });

    res.render('twitterMessages', {
      messages: allMessages
    })

  });
});

router.get('/twitter/messages/send/:id', function(req, res) {
  req.user.followers.forEach(function(follower) {
    if (follower.id == req.params.id) {
      res.render('newMessage', {
        name: follower.screen_name,
        type: "Twitter Direct",
        id: req.params.id
      })
    }
  })
})

router.post('/twitter/messages/send/:id', function(req, res) {
  req.user.followers.forEach(function(follower) {
    if (follower.id == req.params.id) {
      var text = encodeURIComponent(req.body.content);
      twitterClient.post(`/direct_messages/new?text=${text}&screen_name=${follower.screen_name}`, function(err, response) {
        if (err) {
          console.log("error posting message", err);
        } else {
          res.redirect('/twitter/messages');
        }
      });
    }
  })
});




module.exports = router;
