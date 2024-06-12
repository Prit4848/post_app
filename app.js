const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const post = require("./models/post");
const upload = require("./configs/multer")
const path = require("path")

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,'public')));

// create protected rout
function isLoggedIn(req, res, next) {
  if (!req.cookies.token || req.cookies.token === "") {
    res.redirect("/login");
  } else {
    try {
      let data = jwt.verify(req.cookies.token, "shhhh");
      req.user = data;
      next();
    } catch (err) {
      res.redirect("/login");
    }
  }
}

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/profile", isLoggedIn,async function (req, res) {
     let user =await userModel.findOne({email:req.user.email}).populate("posts")
    
      res.render("profile",{user})
});

app.get("/profile/upload",function(req,res){
  res.render("upload")
})

app.post("/profile/upload",isLoggedIn,upload.single("image"),async function(req,res){
  let user = await userModel.findOne({email: req.user.email});
  
  user.profilepic = req.file.filename;
  await user.save();
  res.redirect("/profile")
  console.log(req.file)
})

app.get('/like/:id',isLoggedIn,async function(req,res){
   let post = await postModel.findOne({_id: req.params.id}).populate("user")
  //  post.likes.push(req.user.userid)
  //  await post.save();
  console.log(req.user)
   res.redirect("/profile")
  
})

app.post("/post", isLoggedIn,async function(req,res){
  let user =await userModel.findOne({email:req.user.email})
  let { content } = req.body;

  let post = await postModel.create({
    user: user._id,
    content
  })

  user.posts.push(post._id)
  await user.save();

  res.redirect("/profile")

})

app.post("/register", async (req, res) => {
  let { name, username, email, password, age } = req.body;
  let user = await userModel.findOne({ email });
  if (user) return res.status(500).send("user have alredy account here !!");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = await userModel.create({
        username,
        name,
        password: hash,
        age,
        email,
      });
      let token = jwt.sign({ email: email }, "shhhh");
      res.cookie("token", token);
      res.send("registered");
    });
  });
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/login", async function (req, res) {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.status(500).send("something went to wrong");

  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
      let token = jwt.sign({ email: email }, "shhhh");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else return res.redirect("/login");
  });
});

app.get("/logout", function (req, res) {
  res.cookie("token", "");
  res.redirect("/login");
});



app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
