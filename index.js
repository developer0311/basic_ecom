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
const admin_password = process.env.ADMIN_PASSWORD
let home_active = "active";
let cart_active = "";

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

  try {
    if (!searchQuery) {
      return res.status(400).send("Search query is required");
    }
    const result = await db.query(
      "SELECT * FROM products WHERE name ILIKE $1",
      [`%${searchQuery}%`]
    );
    res.render("searchResults", { products: result.rows, query: searchQuery });
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
  res.render(__dirname + "/views/login.ejs", { profile_name: username, 
    homeActive: home_active,
    cartActive: cart_active, });
});

app.post("/login",
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
  res.render(__dirname + "/views/register.ejs", { profile_name: username, 
    homeActive: home_active,
    cartActive: cart_active, });
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

app.get("/specific", (req, res) => {
  active_page("home");
  res.render(__dirname + "/views/specific.ejs", {
    profile_name: username || "Guest",
  });
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

app.get(`/admin/${admin_password}/products/edit/:productId`, async (req, res) => {
  const productId = req.params.productId;
  let result = await db.query("SELECT * FROM products where id=$1", [productId]);
  res.render(__dirname + "/views/admin_product_edit.ejs", {
    product_detail: result.rows[0],
  });
});

app.get(`/admin/${admin_password}/products/delete/:productId`, async (req, res) => {
  const productId = req.params.productId;
  let result = await db.query("SELECT * FROM products where id=$1", [productId]);
  res.render(__dirname + "/views/admin_product_confirm_delete.ejs", {
    product_detail: result.rows[0],
  });
});

app.get(`/admin/${admin_password}/users`, (req, res) => {
  res.render(__dirname + "/views/admin_users.ejs");
});

app.get(`/admin/${admin_password}/comments`, (req, res) => {
  res.render(__dirname + "/views/admin_comments.ejs");
});

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
// app.post("/admin/products/create",
//   upload.fields([
//     { name: "pdf_file", maxCount: 1 },
//     { name: "cover_image", maxCount: 1 },
//   ]),
//   async (req, res) => {
//     try {
//       const {
//         title,
//         subtitle,
//         author_name,
//         publish_date,
//         description,
//         drive_pdf_url,
//         likes,
//         shares,
//         downloads,
//       } = req.body;

//       const coverImage = req.files["cover_image"][0];
//       const pdfFile = req.files["pdf_file"][0];

//       const coverImageUploadResult = await handleCloudinaryImageUpload(
//         path.resolve(coverImage.path),
//         path.basename(
//           coverImage.originalname,
//           path.extname(coverImage.originalname)
//         )
//       );

//       const pdfResult = await handleCloudinaryPDFUpload(
//         path.resolve(pdfFile.path),
//         path.basename(pdfFile.originalname, path.extname(pdfFile.originalname))
//       );

//       // Delete local files after successful upload
//       deleteFile(path.resolve(coverImage.path));
//       deleteFile(path.resolve(pdfFile.path));

//       let pdf_download_link = `https://res-console.cloudinary.com/dimlxk34m/media_explorer_thumbnails/${pdfResult.uploadResult.asset_id}/download`

//       // Insert product data into the database with Cloudinary URLs
//       const result = await db.query(
//         `INSERT INTO products (title, subtitle, author_name, publish_date, description, image_name, image_url, pdf_name, pdf_url, pdf_drive_url, likes, shares, downloads)
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
//         RETURNING *`,
//         [
//           title,
//           subtitle,
//           author_name,
//           publish_date,
//           description,
//           coverImageUploadResult.uploadResult.public_id,
//           coverImageUploadResult.uploadResult.secure_url, // Store Cloudinary URL for the image
//           pdfResult.uploadResult.public_id,
//           pdf_download_link, // Store Cloudinary URL for the PDF
//           drive_pdf_url,
//           likes || 100, // Default to 100 if not provided
//           shares || 12, // Default to 12 if not provided
//           downloads || 10, // Default to 10 if not provided
//         ]
//       );
//       res.redirect(`/admin/${admin_password}`);
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   }
// );

// //------------------------------------------------------ ADMIN EDIT product ------------------------------------------------------//

// app.post("/admin/products/update/:productId",
//   upload.single("pdf_name"),
//   async (req, res) => {
//     const productId = req.params.productId; // Get the productId from the request parameters
//     const {
//       title,
//       subtitle,
//       author_name,
//       publish_date,
//       description,
//       image_name,
//       pdf_drive_url,
//       likes,
//       shares,
//       downloads,
//     } = req.body;

//     // Update the product in the database
//     const updateResult = await db.query(
//       `UPDATE products 
//            SET title = $1, subtitle = $2, author_name = $3, publish_date = $4, 
//                description = $5, image_name = $6, pdf_drive_url = $7, 
//                likes = $8, shares = $9, downloads = $10 
//            WHERE id = $11 RETURNING *`,
//       [
//         title,
//         subtitle,
//         author_name,
//         publish_date,
//         description,
//         image_name,
//         pdf_drive_url,
//         likes,
//         shares,
//         downloads,
//         productId,
//       ]
//     );

//     if (updateResult.rowCount > 0) {
//       // product updated successfully
//       res.redirect(`/admin/${admin_password}/products`); // Redirect to the products management page
//     } else {
//       // product not found
//       res.status(404).send("product not found");
//     }
//   }
// );

// //------------------------------------------------------ DELETE product ------------------------------------------------------//

// // Route to delete a product and its associated files
// app.post("/admin/products/delete/:productId", async (req, res) => {
//   const productId = req.params.productId; // Get the productId from the request parameters

//   try {
//     // First, retrieve the product data to get the file names
//     const productResult = await db.query(
//       "SELECT image_name, pdf_name FROM products WHERE id = $1",
//       [productId]
//     );

//     if (productResult.rowCount === 0) {
//       return res.status(404).send("product not found");
//     }

//     const product = productResult.rows[0];

//     await handleCloudinaryImageDelete(product.image_name)
//     await handleCloudinaryPDFDelete(product.pdf_name)

//     await db.query("DELETE FROM products WHERE id = $1", [productId]);

//     res.redirect(`/admin/${admin_password}/products`); // Redirect to the products management page
//   } catch (error) {
//     console.error("Error deleting product:", error);
//     res.status(500).send("Server error");
//   }
// });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
