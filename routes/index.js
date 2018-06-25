var express = require("express");
var router = express.Router();
var User = require("../models/user");
var Campground = require("../models/campgrounds");
var passport = require("passport");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");

//root route
router.get("/", function(req, res){
   res.render("landing"); 
});

//============================
//AUTH ROUTES
//============================

//register route
router.get("/register", function(req, res){
   res.render("register", {page: "register"}); 
});

//handle register logic
router.post("/register", function(req, res){
   var newUser = new User({
      username: req.body.username, 
      firstName: req.body.firstName, 
      lastName: req.body.lastName, 
      email: req.body.email, 
      avatar: req.body.avatar
   });

   if(req.body.adminCode === "secretCode123"){
      newUser.isAdmin = true;
   }

   User.register(newUser, req.body.password, function(err, user){
       if(err){
           req.flash("error", err.message);
           return res.redirect("/register");
       }
       passport.authenticate("local")(req, res, function(){
         req.flash("success", "Welcome to YelpCamp " + user.username);
         res.redirect("/campgrounds");
       });
   });
});

//show login form
router.get("/login", function(req, res){
   res.render("login", {page : "login"}); 
});

//handling login logic
router.post("/login", passport.authenticate("local", {
            successRedirect: "/campgrounds",
            failureRedirect: "/login"
        }), 
    function(req, res){
});

//logout logic
router.get("/logout", function(req, res){
   req.logout();
   req.flash("success", "Logged you out!");
   res.redirect("back");
});

//USER PROFILE
router.get("/users/:id", function(req, res){
   User.findById(req.params.id, function(err, foundUser){
      if(err || !foundUser){
         req.flash("error", "That user does not exists anymore.");
         return res.redirect("back");
      }
      
      Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds){
         if(err){
            req.flash("error", "Something went wrong. Try again!");
            res.redirect("back");
         }
         res.render("users/show", {user: foundUser, campgrounds: campgrounds});
      });
   });
});

//FORGOT PASSWORD SHOW PAGE
router.get("/forgot", function(req, res){
  res.render("forgot");
});

router.post("/forgot", function(req, res){
   async.waterfall([
      function(done) {
         crypto.randomBytes(20, function(err, buf){
            var token = buf.toString('hex');
            done(err, token);
         });
      },
      function(token, done){
         User.findOne({email: req.body.email}, function(err, user){
            if(err || !user){
               req.flash("error", "No account with that email address exists!");
               return req.redirect("/forgot");
            }
            
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000;
            
            user.save(function(err){
               done(err, token, user);
            });
         });
      },
      function(token, user, done){
         var smtpTransport = nodemailer.createTransport({
            service: "Gmail",
            auth: {
               user: "onkaryerawar99@gmail.com",
               pass: process.env.GMAILPW
            }
         });
         var mailOptions = {
            to: user.email,
            from: "onkaryerawar99@gmail.com",
            subject: "Reset password for your YelpCamp account!",
            text: "https://" + req.headers.host + "/reset/" + token
         };
         smtpTransport.sendMail(mailOptions, function(err){
            req.flash("success", "An email has been sent to " + user.email + " with further instructions");
            done(err, "done");
         });
      }
   ], function(err){
      if (err){
         console.log("Error=" + err);
      }
      res.redirect("/forgot");
   });
});

router.get("/reset/:token", function(req, res){
   User.findOne({ resetPasswordToken : req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user){
      if(err || !user){
         req.flash("error", "Password reset token is invalid or has expired!");
         return res.redirect("/forgot");
      }
      res.render("reset", {token: req.params.token});
   });
});

router.post("/reset/:token", function(req, res){
   async.waterfall([
      function(done){
         User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user){
            if(err || !user){
               req.flash("error", "Password reset token is invalied or has expired");
               return res.redirect('back');
            }
            if(req.body.password == req.body.confirm){
               user.setPassword(req.body.password, function(err){
                  user.resetPasswordToken = undefined;
                  user.resetPasswordExpires = undefined;
                  
                  user.save(function(err){
                     req.logIn(user, function(err){
                        done(err, user);
                     });
                  });
               });
            } else {
               req.flash("error", "Passwords do not match");
               return res.redirect('back');
            }
         });
      },
      function(user, done){
         var smtpTransport = nodemailer.createTransport({
            service: "Gmail",
            auth: {
               user: 'onkaryerawar99@gmail.com',
               pass: process.env.GMAILPW
            }
         });
         var mailOptions = {
            to: user.email,
            from: 'onkaryerawar99@gmail.com',
            subject: 'Your password has been changed',
            text: 'Hello, \n\n' + 'This is a confirmation that the password for your account ' + user.email + ' has just been changed'
         };
         smtpTransport.sendMail(mailOptions, function(err){
            req.flash('success', 'Success! Your password has been changed.');
            done(err);
         });
      }
      ], function(err){
         if(err){
            return res.redirect('back');
         }
         res.redirect('/campgrounds');
      });
});


module.exports = router;