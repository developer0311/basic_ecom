import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import nodemailer from "nodemailer";
import Razorpay from 'razorpay';
import "dotenv/config";

const app = express();
const port = process.env.SERVER_PORT;
const __dirname = dirname(fileURLToPath(import.meta.url));
const saltRounds = 10;
const admin_password = process.env.ADMIN_PASSWORD;
const RAZORPAY_ID_KEY = process.env.RAZORPAY_ID_KEY;
const RAZORPAY_SECRET_KEY = process.env.RAZORPAY_SECRET_KEY;
let home_active = "active";
let cart_active = "";

app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 },
  })
);
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(passport.initialize());
app.use(passport.session());

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY
});

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();

//-------------------------- FUNCTIONS --------------------------//

let get_username = (email) => {
  const username = email.split("@")[0]; // Splits at '@' and takes the first part
  return username; // Output: dipratidas2004
};

let active_page = (pageName) => {
  if (pageName == "home") {
    home_active = "active";
    cart_active = "";
  } else if (pageName == "cart") {
    home_active = "";
    cart_active = "active";
  }
};

//-------------------------- INDEX Routes --------------------------//

app.get("/search", async (req, res) => {
  const searchQuery = req.query.query; // Get the search term from the query string
  if (!req.isAuthenticated()) {
    return res.redirect("/login"); // Redirect to login if not authenticated
  }
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if the user is authenticated

  try {
    if (!searchQuery) {
      return res.status(400).send("Search query is required");
    }
    const result = await db.query(
      "SELECT * FROM products WHERE name ILIKE $1",
      [`%${searchQuery}%`]
    );
    if (result.rows.length == 0) {
      return res.redirect("/home")
    }
    res.render(__dirname + "/views/specific", { product: result.rows[0], query: searchQuery, profile_name: username || "Guest",
      homeActive: home_active,
      cartActive: cart_active, });
  } catch (error) {
    console.error("Error executing query", error.stack);
    res.status(500).send("Internal Server Error");
  }
});

//-------------------------- INDEX Routes --------------------------//

app.get("/", (req, res) => {
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if the user is authenticated
  res.render(__dirname + "/views/home.ejs", {
    profile_name: username,
    homeActive: home_active,
    cartActive: cart_active,
    hide_footer:"none",
  }); // Render the home view
});

//-------------------------- INDEX Routes --------------------------//

app.get(
  "/auth/google/home",
  passport.authenticate("google", {
    successRedirect: "/home",
    failureRedirect: "/login",
  })
);

app.get("/home", async (req, res) => {
  active_page("home");
  if (req.isAuthenticated()) {
    try {
      const user = req.user;
      let username = get_username(user.email);
      const e_result = await db.query(
        "SELECT * FROM products WHERE category = $1",
        ["electronics"]
      );
      const m_result = await db.query(
        "SELECT * FROM products WHERE category = $1",
        ["mens clothing"]
      );
      const w_result = await db.query(
        "SELECT * FROM products WHERE category = $1",
        ["womens clothing"]
      );

      res.render(__dirname + "/views/index.ejs", {
        electronics: e_result.rows,
        mensWear: m_result.rows,
        womensWear: w_result.rows,
        profile_name: username || "Guest",
        homeActive: home_active,
        cartActive: cart_active,
      });
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

//-------------------------- SPECIFIC ITEMS Routes --------------------------//

app.get("/specific", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login"); // Redirect to login if not authenticated
  }
  active_page("home");
  try {
    const productId = parseInt(req.query.id);
    if (isNaN(productId)) {
      return res.status(400).send("Invalid product ID");
    }

    const result = await db.query("SELECT * FROM products WHERE id = $1", [
      productId,
    ]);
    const product = result.rows[0];

    if (product) {
      const user = req.user;
      let username = get_username(user.email);
      res.render(__dirname + "/views/specific.ejs", {
        product: product,
        profile_name: username || "Guest",
        homeActive: home_active,
        cartActive: cart_active,
      });
    } else {
      res.status(404).send("Product not found");
    }
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).send("Server error");
  }
});

//-------------------------- CART Routes --------------------------//

app.get("/cart", async (req, res) => {
  active_page("cart");
  if (req.isAuthenticated()) {
    try {
      const userId = req.user.id; // Get the authenticated user's ID
      const cartItemsResult = await db.query(
        `SELECT cart.id AS cart_id, cart.user_id, cart.product_id, products.name, products.price, products.image_url
         FROM cart 
         JOIN products ON cart.product_id = products.id 
         WHERE cart.user_id = $1`,
        [userId]
      );

      const cartItems = cartItemsResult.rows;
      const totalPrice = cartItems.reduce((total, item) => {
        return total + parseFloat(item.price); // Convert price to float before adding
      }, 0);

      const username = get_username(req.user.email); // Get the username
      res.render(__dirname + "/views/cart.ejs", {
        cartItems: cartItems || [],
        totalPrice,
        profile_name: username || "Guest", // Ensure username is defined here
        homeActive: home_active,
        cartActive: cart_active,
      });
    } catch (err) {
      console.error("Error fetching cart items:", err);
      res.status(500).send("Server error");
    }
  } else {
    res.redirect("/login"); // Redirect to login if not authenticated
  }
});

app.get("/cart/add", async (req, res) => {
  const userId = req.user.id;
  const productId = parseInt(req.query.productId);

  try {
    const existingItem = await db.query(
      "SELECT * FROM cart WHERE user_id = $1 AND product_id = $2",
      [userId, productId]
    );
    if (existingItem.rows.length > 0) {
      return res.status(400).send("Product already in cart");
    }
    await db.query("INSERT INTO cart (product_id, user_id) VALUES ($1, $2)", [
      productId,
      userId,
    ]);
    res.redirect("/cart");
  } catch (err) {
    console.error("Error adding product to cart:", err);
    res.status(500).send("Server error");
  }
});

app.post("/cart/remove", async (req, res) => {
  const itemId = parseInt(req.body.cartId); // Convert cartId to an integer

  if (isNaN(itemId)) {
    return res.status(400).send("Invalid cart ID");
  }

  try {
    await db.query("DELETE FROM cart WHERE id = $1", [itemId]);
    res.redirect("/cart");
  } catch (err) {
    console.error("Error removing item from cart:", err);
    res.status(500).send("Server error");
  }
});

app.post("/cart/checkout", async (req, res) => {
  const userId = req.user.id; // Get the user ID from the authenticated user

  try {
    await db.query("DELETE FROM cart WHERE user_id = $1", [userId]);
    res.redirect("/cart");
  } catch (err) {
    console.error("Error during checkout:", err);
    res.status(500).send("Server error");
  }
});

//-------------------------- LOGIN Route --------------------------//

app.get("/login", (req, res) => {
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated
  active_page("home");
  res.render(__dirname + "/views/login.ejs", {
    profile_name: username,
    homeActive: home_active,
    cartActive: cart_active,
    hide_footer:"none",
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login",
  })
);

//-------------------------- REGISTER Route --------------------------//

app.get("/register", (req, res) => {
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated
  active_page("home");
  res.render(__dirname + "/views/register.ejs", {
    profile_name: username,
    homeActive: home_active,
    cartActive: cart_active,
    hide_footer:"none",
  });
});

app.post("/register", async (req, res) => {
  const { email, password, otp, first_name, last_name, mobile_number } = req.body;

  try {
    // Validate session data for OTP and email
    const storedOtp = req.session.otp;
    const storedEmail = req.session.email;

    if (!storedOtp || !storedEmail) {
      return res.render("register", {
        profile_name: "Guest",
        homeActive: "active",
        cartActive: "",
        errorMessage: "OTP session expired. Please request a new OTP.",
      });
    }

    // Validate OTP and email
    const isOtpValid = await bcrypt.compare(otp, storedOtp);
    if (!isOtpValid) {
      return res.render("register", {
        profile_name: "Guest",
        homeActive: "active",
        cartActive: "",
        errorMessage: "Invalid OTP. Please try again.",
      });
    }

    if (email !== storedEmail) {
      return res.render("register", {
        profile_name: "Guest",
        homeActive: "active",
        cartActive: "",
        errorMessage: "Email mismatch. Please use the correct email.",
      });
    }

    // Check if the user is already registered by email or mobile number
    const checkResult = await db.query(
      "SELECT * FROM users WHERE email = $1 OR mobile_number = $2",
      [email, mobile_number]
    );

    if (checkResult.rows.length > 0) {
      // Determine the specific error
      const existingUser = checkResult.rows[0];
      let errorMessage = "An account with these details already exists.";
      if (existingUser.email === email) {
        errorMessage = "Email is already registered.";
      } else if (existingUser.mobile_number === mobile_number) {
        errorMessage = "Mobile number is already registered.";
      }
      return res.render("register", {
        profile_name: "Guest",
        homeActive: "active",
        cartActive: "",
        errorMessage: errorMessage,
      });
    }

    // Hash the password and register the user
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      `INSERT INTO users (first_name, last_name, mobile_number, email, password)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [first_name, last_name, mobile_number, email, hashedPassword]
    );

    const user = result.rows[0];

    // Log in the user after registration
    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).render("register", {
          profile_name: "Guest",
          homeActive: "active",
          cartActive: "",
          errorMessage: "An error occurred during login. Please try again.",
        });
      }

      console.log("Registration successful");
      return res.redirect("/home");
    });
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).render("register", {
      profile_name: "Guest",
      homeActive: "active",
      cartActive: "",
      errorMessage: "Something went wrong. Please try again later.",
    });
  }
});



//-------------------------- RESET PASSWORD Route --------------------------//

app.get("/reset-password", (req, res) => {
  active_page("home");
  res.render(__dirname + "/views/reset_password.ejs", {
    profile_name: "Guest",
    homeActive: home_active,
    cartActive: cart_active,
  });
});

// when otp requested then it will send otp via smtp
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, error: "Email is required." });
  }

  try {
    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the OTP before storing it
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Store hashed OTP and email in session
    req.session.otp = hashedOtp;
    req.session.email = email;

    // Configure SMTP transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. This code is valid for 10 minutes.`,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Respond with success
    res.json({ success: true });

  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ success: false, error: "Failed to send OTP." });
  }
});


// when click on submit then check the user given otp with the generated otp, if matched then render new_password.ejs page
app.post("/check-otp", async (req, res) => {
  const { otp } = req.body;

  // Retrieve hashed OTP and email from session
  const hashedOtp = req.session.otp;
  const email = req.session.email;

  if (!hashedOtp || !email) {
    return res.status(400).json({
      success: false,
      error: "OTP session expired. Please request a new OTP.",
    });
  }

  // Verify the OTP
  const isMatch = await bcrypt.compare(otp, hashedOtp);

  if (isMatch) {
    // OTP is correct, render the new password page
    active_page("home");
    res.render("new_password", {
      email: email,
      profile_name: "Guest",
      homeActive: home_active,
      cartActive: cart_active,
    });
  } else {
    // OTP is incorrect
    res.status(400).json({
      success: false,
      error: "Invalid OTP. Please try again.",
    });
  }
});


app.post("/reset-password", async (req, res) => {
  const { password, confirm_password } = req.body;

  if (password !== confirm_password) {
      return res.status(400).json({ success: false, error: "Passwords do not match." });
  }

  const email = req.session.email;
  if (!email) {
      return res.status(400).json({ success: false, error: "Session expired. Please request OTP again." });
  }

  try {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the password in the database (assuming you have a `users` table with an `email` column)
      await db.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, email]);

      // Optionally, clear the OTP and email session
      delete req.session.otp;
      delete req.session.email;

      res.redirect("/home");
  } catch (err) {
      console.error("Error resetting password:", err);
      res.status(500).json({ success: false, error: "Failed to reset password." });
  }
});


//-------------------------- PAYMENT Route --------------------------//


// POST /createOrder route
app.post("/createOrder", async (req, res) => {
  const user = req.user;
  let username = get_username(user.email);
  try {
      const { amount, name, description } = req.body;

      // Ensure `amount` is a valid number
      if (!amount || isNaN(amount)) {
          return res.status(400).send({ success: false, msg: "Invalid amount provided." });
      }

      // Razorpay requires the amount in the smallest currency unit (paise for INR)
      const orderAmount = amount * 100;

      const options = {
          amount: orderAmount, // Amount in paise
          currency: "INR",
          receipt: `receipt_${Date.now()}`, // Unique receipt identifier
      };

      // Create the Razorpay order
      razorpayInstance.orders.create(options, (err, order) => {
          if (!err) {
              res.status(200).send({
                  success: true,
                  msg: "Order Created",
                  order_id: order.id,
                  amount: orderAmount,
                  key_id: RAZORPAY_ID_KEY,
                  product_name: name,
                  description: description,
                  contact: user.mobile_number, // Replace with dynamic values if needed
                  name: user.first_name, // Replace with dynamic values if needed
                  email: user.email, // Replace with dynamic values if needed
              });
          } else {
              console.error(err);
              res.status(400).send({ success: false, msg: "Something went wrong!" });
          }
      });
  } catch (error) {
      console.error("Error in creating order:", error.message);
      res.status(500).send({ success: false, msg: "Server error." });
  }
});

//-------------------------- LOGOUT Route --------------------------//

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/home",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

//-------------------------- ADMIN GET Routes --------------------------//

app.get(`/admin-login`, (req, res) => {
  active_page("home");
  res.render(__dirname + "/views/admin_login.ejs", {
    profile_name: "Admin",
    homeActive: home_active,
    cartActive: cart_active,
  });
});

app.get(`/admin/${admin_password}`, (req, res) => {
  res.render(__dirname + "/views/admin.ejs");
});

app.get(`/admin/${admin_password}/create-product`, (req, res) => {
  res.render(__dirname + "/views/admin_create_product.ejs");
});

app.get(`/admin/${admin_password}/products`, async (req, res) => {
  let result = await db.query("SELECT * FROM products");
  res.render(__dirname + "/views/admin_product.ejs", { products: result.rows });
});

app.get(
  `/admin/${admin_password}/products/edit/:productId`,
  async (req, res) => {
    const productId = req.params.productId;
    let result = await db.query("SELECT * FROM products where id=$1", [
      productId,
    ]);
    res.render(__dirname + "/views/admin_product_edit.ejs", {
      product_detail: result.rows[0],
    });
  }
);

app.get(
  `/admin/${admin_password}/products/delete/:productId`,
  async (req, res) => {
    const productId = req.params.productId;
    let result = await db.query("SELECT * FROM products where id=$1", [
      productId,
    ]);
    res.render(__dirname + "/views/admin_product_confirm_delete.ejs", {
      product_detail: result.rows[0],
    });
  }
);

app.get(`/admin/logout`, async (req, res) => {
  active_page("home");
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated
  res.redirect("/home");
});

//------------------------------------------------------ ADMIN LOGIN ROUTES ------------------------------------------------------//

// Admin login route
app.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch admin details from the database
    const result = await db.query("SELECT * FROM admins WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      // Admin not found
      return res
        .status(401)
        .json({ message: "Login unsuccessful: Admin not found" });
    }

    const admin = result.rows[0];

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (isPasswordValid) {
      // Password is correct, store admin session
      return res.render(__dirname + "/views/admin.ejs");
    } else {
      // Invalid password
      return res
        .status(401)
        .json({ message: "Login unsuccessful: Incorrect password" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

//------------------------------------------------------ ADMIN CREATE NEW product ------------------------------------------------------//

// Route to handle product creation with both PDF and cover image upload
app.post("/admin/products/create", async (req, res) => {
  try {
    const {
      name,
      max_price,
      price,
      offer_percent,
      description,
      image_url,
      category,
    } = req.body;

    const result = await db.query(
      `INSERT INTO products (name, max_price, price, offer_percent, description, image_url, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
      [
        name,
        max_price,
        price,
        offer_percent,
        description,
        image_url,
        category, // Default to 10 if not provided
      ]
    );
    res.redirect(`/admin/${admin_password}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//------------------------------------------------------ ADMIN EDIT product ------------------------------------------------------//

app.post("/admin/products/update/:productId", async (req, res) => {
  const productId = req.params.productId; // Get the productId from the request parameters
  const {
    name,
    max_price,
    price,
    offer_percent,
    description,
    image_url,
    category,
  } = req.body;

  // Update the product in the database
  const updateResult = await db.query(
    `UPDATE products
           SET name = $1, max_price = $2, price = $3, offer_percent = $4,
               description = $5, image_url = $6, category = $7 
               WHERE id = $8 RETURNING *`,
    [
      name,
      max_price,
      price,
      offer_percent,
      description,
      image_url,
      category,
      productId,
    ]
  );

  if (updateResult.rowCount > 0) {
    // product updated successfully
    res.redirect(`/admin/${admin_password}/products`); // Redirect to the products management page
  } else {
    // product not found
    res.status(404).send("product not found");
  }
});

//------------------------------------------------------ DELETE product ------------------------------------------------------//

app.post("/admin/products/delete/:productId", async (req, res) => {
  const productId = req.params.productId;

  try {
    const productResult = await db.query(
      "SELECT * FROM products WHERE id = $1",
      [productId]
    );

    if (productResult.rowCount === 0) {
      return res.status(404).send("product not found");
    }

    await db.query("DELETE FROM products WHERE id = $1", [productId]);

    res.redirect(`/admin/${admin_password}/products`);
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
