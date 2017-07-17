var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var connect = process.env.MONGODB_URI;

// If you're getting an error here, it's probably because
// your connect string is not defined or incorrect.
mongoose.connect(connect);

// Step 1: Write your schemas here!
// Remember: schemas are like your blueprint, and models
// are like your building!

var userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  password: String,
  phone: String,
  facebookId: String,
  pictureUrl: String,
  twitterId: String,
  followers: Object
});

userSchema.statics.findOrCreate = function(findBy, addOn, callback) {
  User.findOneAndUpdate(findBy, addOn, function(err, user) {
    if (err) {
      return callback(err, null);
    } else if (user) {
      return callback(null, user);
    } else {
      var newUserObject = {};
      Object.keys(addOn).forEach(function(key) {
        newUserObject[key] = addOn[key];
      });
      Object.keys(findBy).forEach(function(key) {
        newUserObject[key] = findBy[key];
      });
      var newUser = new User(newUserObject);
      newUser.save(function(err, savedUser) {
        return callback(null, savedUser);
      });
    }
  });
}

var contactSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  owner: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});

var messageSchema = new Schema({
  created: {
    type: Date,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  contact: {
    type: Schema.ObjectId,
    ref: 'Contact'
  },
  channel: {
    type: String,
    default: 'SMS'
  },
  status: {
    type: String,
    required: true
  },
  from: String
});


// Step 2: Create all of your models here, as properties.
var User = mongoose.model('User', userSchema);
var Contact = mongoose.model('Contact', contactSchema);
var Message = mongoose.model('Message', messageSchema);

// Step 3: Export your models object

module.exports = {
  User: User,
  Contact: Contact,
  Message: Message
}
