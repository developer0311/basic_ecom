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
import "dotenv/config";




const app = express();
const port = process.env.SERVER_PORT;
const __dirname = dirname(fileURLToPath(import.meta.url));
const saltRounds = 10;


app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(passport.initialize());
app.use(passport.session());


const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();




let get_username = (email)=>{
  const username = email.split('@')[0]; // Splits at '@' and takes the first part
  return username; // Output: dipratidas2004

}


//-------------------------- INDEX Routes --------------------------//

app.get('/search', async (req, res) => {
  const searchQuery = req.query.query; // Get the search term from the query string

  try {
      if (!searchQuery) {
          return res.status(400).send('Search query is required');
      }
      const result = await db.query('SELECT * FROM products WHERE name ILIKE $1', [`%${searchQuery}%`]);
      res.render('searchResults', { products: result.rows, query: searchQuery });
  } catch (error) {
      console.error('Error executing query', error.stack);
      res.status(500).send('Internal Server Error');
  }
});


//-------------------------- INDEX Routes --------------------------//

app.get("/", (req, res) => {
  const username = req.isAuthenticated() ? get_username(req.user.email) : 'Guest'; // Check if the user is authenticated
  res.render(__dirname + "/views/home.ejs", { profile_name: username }); // Render the home view
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
  
  if (req.isAuthenticated()) {
    try {
      const user = req.user;
      let username = get_username(user.email)
      const e_result = await db.query('SELECT * FROM products WHERE category = $1', ["electronics"]);
      res.render(__dirname + "/views/index.ejs", { electronics: e_result.rows, profile_name: username || 'Guest' });
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});


//-------------------------- SPECIFIC ITEMS Routes --------------------------//

app.get('/specific', async (req, res) => {
  try {
    const productId = parseInt(req.query.id);
    if (isNaN(productId)) {
      return res.status(400).send('Invalid product ID');
    }

    const result = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    const product = result.rows[0];

    if (product) {
      const user = req.user;
      let username = get_username(user.email)
      res.render(__dirname + "/views/specific.ejs", { product: product, profile_name: username || 'Guest'  });
    } else {
      res.status(404).send('Product not found');
    }
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).send('Server error');
  }
});




//-------------------------- CART Routes --------------------------//

app.get("/cart", async (req, res) => {
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
        profile_name: username || 'Guest', // Ensure username is defined here
      });
    } catch (err) {
      console.error("Error fetching cart items:", err);
      res.status(500).send("Server error");
    }
  } else {
    res.redirect("/login"); // Redirect to login if not authenticated
  }
});


app.get('/cart/add', async (req, res) => {
  const userId = req.user.id; 
  const productId = parseInt(req.query.productId);

  try {
    const existingItem = await db.query('SELECT * FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    if (existingItem.rows.length > 0) {
      return res.status(400).send('Product already in cart');
    }
    await db.query('INSERT INTO cart (product_id, user_id) VALUES ($1, $2)', [productId, userId]);
    res.redirect('/cart');
  } catch (err) {
    console.error('Error adding product to cart:', err);
    res.status(500).send('Server error');
  }
});


app.post('/cart/remove', async (req, res) => {
  const itemId = parseInt(req.body.cartId); // Convert cartId to an integer

  if (isNaN(itemId)) {
    return res.status(400).send('Invalid cart ID');
  }

  try {
    await db.query('DELETE FROM cart WHERE id = $1', [itemId]);
    res.redirect('/cart');
  } catch (err) {
    console.error('Error removing item from cart:', err);
    res.status(500).send('Server error');
  }
});



app.post('/cart/checkout', async (req, res) => {
  const userId = req.user.id; // Get the user ID from the authenticated user
  
  try {
    await db.query('DELETE FROM cart WHERE user_id = $1', [userId]);
    res.redirect('/cart');
  } catch (err) {
    console.error('Error during checkout:', err);
    res.status(500).send('Server error');
  }
});


//-------------------------- LOGIN Route --------------------------//

app.get("/login", (req, res) => {
  const username = req.isAuthenticated() ? get_username(req.user.email) : 'Guest'; // Check if user is authenticated
  res.render(__dirname + "/views/login.ejs", { profile_name: username });
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
  const username = req.isAuthenticated() ? get_username(req.user.email) : 'Guest'; // Check if user is authenticated
  res.render(__dirname + "/views/register.ejs", { profile_name: username });
});


app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/home");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});


//-------------------------- SPECIFIC ITEM Route --------------------------//

app.get("/specific", (req, res) =>{
  res.render(__dirname + "/views/specific.ejs", { profile_name: username || 'Guest' })
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



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
