var express = require("express");
var router = express.Router();
var Campground = require("../models/campgrounds");
var middleware = require("../middleware");
var NodeGeocoder = require('node-geocoder');
var multer = require('multer');
var cloudinary = require('cloudinary');

var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);

var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter});

cloudinary.config({ 
  cloud_name: 'onkaryerawar99', 
  api_key: '938672612351449', 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//show campgrounds
router.get("/", function(req, res){
    var perPage = 4;
    var pageNumber = parseInt(req.query.page);
    pageNumber = pageNumber ? pageNumber : 1;
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}).skip((pageNumber - 1) * perPage).limit(perPage).sort({name:1}).exec(function(err, campgrounds){
            if(err){
                console.log(err);
            } else{
                    Campground.count({name: regex}).exec(function(err, count){
                        if(err){
                        console.log(err);
                        } else{
                            if(campgrounds.length == 0){
                                req.flash("warning", "No campgrounds matching your search query. Displaying all campgrounds.");
                                res.redirect('/campgrounds');
                            } else{
                                res.render("campgrounds/index", {campgrounds: campgrounds, current: pageNumber, pages: Math.ceil(count/perPage), search: req.query.search});
                            }
                        }
                    });
                }
        });
    }
    else{
        Campground.find({}).skip((pageNumber * perPage) - perPage).limit(perPage).sort({name:1}).exec(function(err, campgrounds){
            if(err){
                console.log(err);
            } else{
                    Campground.count().exec(function(err, count){
                        if(err){
                        console.log(err);
                        } else{
                            if(campgrounds.length == 0){
                                req.flash("success", "Displaying campgrounds matching your search query.");
                                res.redirect('/campgrounds');
                            } else{
                                res.render("campgrounds/index", {campgrounds: campgrounds, current: pageNumber, pages: Math.ceil(count/perPage), search: false});
                            }
                        }
                    });
                }
        });
    }
});

//create campground
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res){
   req.body.campground.author ={
     id: req.user._id,
     username: req.user.username
   };
   geocoder.geocode(req.body.campground.location, function (err, data) {
        if (err || !data.length) {
        req.flash('error', 'Invalid address');
        return res.redirect('back');
        }
       req.body.campground.lat = data[0].latitude;
       req.body.campground.lng = data[0].longitude;
       req.body.campground.location = data[0].formattedAddress;
   
       cloudinary.uploader.upload(req.file.path, function(result) {
            // add cloudinary url for the image to the campground object under image property
            req.body.campground.image = result.secure_url;
            Campground.create(req.body.campground, function(err, campground) {
            if (err) {
                req.flash('error', err.message);
                return res.redirect('back');
            }
            res.redirect('/campgrounds/' + campground.id);
        });
    });
    });
});

//show new campground form
router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("campgrounds/new"); 
});

//show details of one campground
router.get("/:id", function(req, res){
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
       if(err){
           req.flash("error", "Campground not found!");
           console.log(err);
       } else{
           res.render("campgrounds/show", {showCampground: foundCampground});
       }
    });
});

//EDIT CAMPGROUND
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findById(req.params.id, function(err, foundCampground){
        if(err){
            res.redirect("/campgrounds");
        } else{
            res.render("campgrounds/edit", {campground: foundCampground}); 
        }
    });
});

//UPDATE CAMPGROUND
router.put("/:id", middleware.checkCampgroundOwnership, function(req, res){
    
    geocoder.geocode(req.body.campground.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    req.body.campground.lat = data[0].latitude;
    req.body.campground.lng = data[0].longitude;
    req.body.campground.location = data[0].formattedAddress;
    
   Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
       if(err){
           res.redirect("/campgrounds");
       } else{
           res.redirect("/campgrounds/" + req.params.id);
       }
   });
});
});

//DESTROY CAMPGROUND
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
   Campground.findByIdAndRemove(req.params.id, function(err){
      if(err){
          res.redirect("/campgrounds");
      } else{
          res.redirect("/campgrounds");
      }
   });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;