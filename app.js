/* eslint-disable no-unused-vars */
const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
const {
  appointments,
  Elections,
  Admin,
  Questions,
  Answers,
  Voters,
} = require("./models"); //for doing any operations on election we should import models
const bodyParser = require("body-parser"); //for parsing from/to json
var cookieParser = require("cookie-parser");
const path = require("path");
// const Admin= require("./models/user");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");
const { getElementById } = require("domutils");

const saltRounds = 10;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false })); //for encoding urls  form submission for maniputlating election

app.use(cookieParser("SSH! THIS IS A SCRET CODE"));
app.use(csrf("123456789iamasecret987654321look", ["POST", "PUT", "DELETE"]));
app.set("view engine", "ejs"); //setting up engine to work with ejs
app.use(express.static(path.join(__dirname, "public")));

app.use(flash());
app.use(
  session({
    secret: "my-super-secret-keyq3243141234",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hrs
    },
  })
);
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      Admin.findOne({ where: { email: username } })
        .then(async function (user) {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, {
              //if password is not correct
              message: "Invalid Emailid or password",
            });
          }
        })
        .catch((error) => {
          //if Adminis not found
          return done(null, false, { message: "Invalid Emailid or password" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing Adminwith id ", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  Admin.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});
//passport part ,session creation end.

app.get("/", async (request, response) => {
  var bul = false;

  if (request.user) {
    bul = true;
  }
  return response.render("index", {
    title: "Appointments Scheduling Application",
    loginStatus: bul,
    login: bul,
    csrfToken: request.csrfToken(),
  });
});

app.get("/signup", (request, response) => {
  var bul = false;
  if (request.user) {
    bul = true;
  }
  return response.render("signup", {
    title: "signup",
    login: bul,
    csrfToken: request.csrfToken(),
  });
});

// post  -> sign-up
app.post("/admins", async function (request, response) {
  if (request.body.firstName.length == 0) {
    request.flash("error", "First name Required");
    return response.redirect("/signup");
  } else if (request.body.email.length == 0) {
    request.flash("error", "Email Required");
    return response.redirect("/signup");
  } else if (request.body.password.length == 0) {
    request.flash("error", "Password Required");
    return response.redirect("/signup");
  }
  console.log("creating new User", request.body);
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  var bl = await Admin.findOne({
    where: {
      email: request.body.email,
    },
  });
  if (bl != null) {
    request.flash("error", "Email already Exists");
    return response.redirect("/signup");
  }
  try {
    const admin = await Admin.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(admin, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/welcome");
      } else {
        request.flash("success", "Successfully Signed up");
        return response.redirect("/welcome");
      }
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "Email already Exists");
    return response.redirect("/signup");
  }
});

// Get -> login page
app.get("/login", (request, response) => {
  //getting login page to webpage
  return response.render("login", {
    //we are rendering login.ejs
    login: false,
    title: "LogIn page",
    csrfToken: request.csrfToken(),
  });
});

// post for login
app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/welcome");
  }
);

//signout of user
app.get("/signout", (request, response, next) => {
  //next handler
  request.logOut((err) => {
    if (err) return next(err);
    response.redirect("/");
  });
});

// Get -> appointments list
app.get(
  "/welcome",
  connectEnsureLogin.ensureLoggedIn(),

  async (request, response) => {
    var bul = false;
    if (request.user) {
      bul = true;
    }
    const loggedInadmin = request.user.id;
    const allAppointments = await appointments.getAppointments(loggedInadmin);
    if (request.accepts("html")) {
      return response.render("welcome", {
        title: "My Appointments",
        name: request.user.firstName,
        allAppointments,
        login: bul,
        csrfToken: request.csrfToken(),
      });
    } else {
      //for postman like api  we should get json format as it donot support html
      return response.json({
        title: "My Appointments",
        name: request.user.firstName,
        allAppointments,
        login: bul,
        csrfToken: request.csrfToken(),
      });
    }
  }
);

// Get -> appointment create page
app.get(
  "/create-appointment",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    var bul = false;
    if (request.user) {
      bul = true;
    }
    const loggedInadmin = request.user.id;
    const allAppointments = await appointments.getAppointments(loggedInadmin);

    if (request.accepts("html")) {
      //request from web i.e. it accepts html   but for postman it accepts json that is in else part
      return response.render("create-appointment", {
        //new AppallAppointments.ejs should be created
        title: "appointments",
        login: bul,
        email: request.user.email,
        allAppointments,
        csrfToken: request.csrfToken(),
      });
    } else {
      //for postman like api  we should get json format as it donot support html
      return response.json({
        title: "my Appointments",
        email: request.user.email,
        allAppointments,
        csrfToken: request.csrfToken(),
      });
    }
  }
);

// post appointments
app.post(
  "/create-appointment",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    if (request.body.description.length == 0) {
      request.flash("error", "Enter the description");
      return response.redirect("/create-appointment");
    }

    const loggedInadmin = request.user.id;
    const allAppointments = await appointments.getAppointments(loggedInadmin);
    // console.log("the tiiiiiiiiiiiiiiiiiiiiiiiiiiiiime is "+ allAppointments[0].startTime + " and for the body parse is "+request.body.startTime);
    // console.log("comparision "+ allAppointments[0].startTime >= request.body.startTime);
    // console.log("lengtttttttttttttttttttttth "+allAppointments.length);
    var strA = request.body.startTime;
    var strB = request.body.endTime;
    var a = convertTimeToNumber(strA);
    var b = convertTimeToNumber(strB);

    if (a >= b) {
      request.flash("error", "Invalid dates given");
      return response.redirect(`/create-appointment`);
    }
    function convertTimeToNumber(time) {
      const hours = Number(time.split(":")[0]) * 60;
      const minutes = Number(time.split(":")[1]);
      return hours + minutes;
    }
    for (var i = 0; i < allAppointments.length; i++) {
      // if(((request.body.startTime <= allAppointments[i].endTime ) && (request.body.startTime >= allAppointments[i].startTime )) || ((request.body.endTime <= allAppointments[i].endTime ) && (request.body.endTime >= allAppointments[i].startTime ))) {
      var strC = allAppointments[i].startTime.slice(0, 5); //both strings not of same length    here it is taking seconds also so
      var strD = allAppointments[i].endTime.slice(0, 5);
      var c = convertTimeToNumber(strC);
      var d = convertTimeToNumber(strD);

      console.log(
        "a = ",
        a,
        " b = ",
        b,
        " c = ",
        c,
        " d = ",
        d,
        "comppppi ",
        a >= c && a <= d,
        " compi2",
        b > c && b <= d
      );

      if (
        (a >= c && a < d) == true ||
        (b > c && b <= d) == true ||
        (a < c && b > d)
      ) {
        //here iam considering like  endTime and startTime can be at one point
        var rStart = "nothing";
        var rEnd = "nothing";
        console.log("duration ", b - a);
        for (var j = i; j < allAppointments.length - 1; j++) {
          var end = convertTimeToNumber(allAppointments[i].endTime);
          var start = convertTimeToNumber(allAppointments[i + 1].startTime);
          if (start - end >= b - a) {
            rStart = allAppointments[i].endTime;
            rEnd = allAppointments[i + 1].startTime;
          }
        }

        if (rStart != "nothing")
          request.flash(
            "error",
            "Overlapped with event:" +
              allAppointments[i].description +
              "  ==>Recommend time slot can be " +
              rStart +
              " to " +
              rEnd
          );
        else
          request.flash(
            "error",
            "Overlapped with event:" +
              allAppointments[i].description +
              "   ==>Recommended time slot can be after " +
              allAppointments[allAppointments.length - 1].endTime
          );
        return response.redirect(`/create-appointment`);
      }
    }

    try {
      await appointments.addAppointment({
        description: request.body.description,
        adminId: request.user.id,
        startTime: request.body.startTime,
        endTime: request.body.endTime,
      });
      // console.log("dfadfadsfasd.................", request.body);
      return response.redirect(`/welcome`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// Get -> edit appointment page
app.get(
  "/edit-appointment/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    var bul = false;
    if (request.user) {
      bul = true;
    }
    //async for getting req
    try {
      const appointment = await appointments.findByPk(request.params.id);
      return response.render("edit-appointment", {
        title: "Edit appointment",
        appointmentId: request.params.id,
        appointment,
        login: bul,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// using different page for edit. For ease, i used Post method
app.post(
  "/edit-appointment/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const appointment = await appointments.findOne({
      where: {
        id: request.params.id,
        adminId: request.user.id,
      },
    });
    // console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaadesc : "+request.body.description + "appppppppppppppppppppppppp : "+appointment.description)

    if (appointment.description == request.body.description) {
      request.flash("error", "Please update the values..");
      return response.redirect(`/edit-appointment/${request.params.id}`);
    }
    const up = await appointments.update(
      { description: request.body.description },
      {
        where: {
          id: request.params.id,
        },
      }
    );
    // const up =await appointments.editAppointmentName(request.params.id, request.user.id, request.body.description);
    // console.log("the appointment is "+"param id:"+request.params.id+" ap id::"+appointment.id+" desc:"+appointment.description+ " adminId:"+appointment.adminId);
    // console.log("asfddddddddddddddddd....................." + up);
    return response.redirect(`/welcome`);
  }
);

// delete appointment
app.delete(
  "/appointments/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("We have to delete a election with ID: ", request.params.id);
    // FILL IN YOUR CODE HERE
    try {
      //this code is by them i.e. wd   my code is below
      var c = await appointments.deleteAppointment(
        request.params.id,
        request.user.id
      );
      if (c) console.log("deleted successfully");
      else console.log("unsuccesss");
      if (c) return response.json({ success: true });
      return response.json({ success: false });
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);
module.exports = app;
