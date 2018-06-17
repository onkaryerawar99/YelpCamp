var mongoose = require("mongoose");
var Campground = require("./models/campgrounds");
var Comment = require("./models/comment");

var data = [
                {
                    name: "Salmon Creek", 
                    image: "https://farm8.staticflickr.com/7258/7121861565_3f4957acb1.jpg",
                    description: "blah blah"
                },
                {
                    name: "Granite Hill", 
                    image: "https://farm8.staticflickr.com/7389/10630338855_cefaa4764f.jpg",
                    description: "blah blah"
                },
                {
                    name: "Mountain Goat's Rest", 
                    image: "https://farm2.staticflickr.com/1363/1342367857_2fd12531e7.jpg",
                    description: "blah blah"
                }
           ];

function seedDB(){
    
   //Remove all campgrounds
   Campground.remove({}, function(err){
      if(err){
          console.log(err);
      } 
      console.log("removed campgrounds");
      //Add campgrounds
        data.forEach(function(seed){
            Campground.create(seed, function(err, campground){
            if(err){
                   console.log(err)
            } else {
                   console.log("added a campground");
                   //Create comment
                   Comment.create(
                       {
                            text: "This place is great but I wish there was internet!",
                            author: "Homer"
                        }, function(err, comment){
                            if(err){
                                console.log(err);
                            } else{
                                campground.comments.push(comment);
                                campground.save();
                                console.log("New comment added");
                            }
                        }
                    )
            }
        })
    });
   });
   
}

module.exports = seedDB;