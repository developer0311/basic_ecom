# **Basic E-Commerce Application**

A Node.js-based project for building a basic e-commerce platform, featuring **Add to Cart**, **Buy**, **Admin Login**, PostgreSQL integration, and **Email Notifications** via Nodemailer.

---

## **Environment Setup**

### **Step 1: Create a `.env` File**
Create a `.env` file in the root directory and copy the following code into it. Replace the placeholders (`YOUR_*`) with your actual values:

```env
#------------------------------- SERVER DETAILS -------------------------------#
SERVER_PORT=YOUR_SERVER_PORT

#------------------------------- POSTGRES DETAILS -------------------------------#
DB_USER=YOUR_USERNAME
DB_HOST=YOUR_HOSTNAME
DB_NAME=ecommerce
DB_PASSWORD=YOUR_PASSWORD
DB_PORT=5432

#------------------------------- GOOGLE AUTH -------------------------------#
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
SESSION_SECRET=TOPSECRETWORD

#------------------------------- NODEMAILER CREDENTIALS -------------------------------#
SMTP_USER=YOUR_EMAIL
SMTP_PASS=YOUR_PASSKEY

# ------------------------- RAZORPAY CREDENTIALS  -------------------------

RAZORPAY_ID_KEY=YOUR_RAZORPAY_ID_KEY
RAZORPAY_SECRET_KEY=YOUR_RAZORPAY_SECRET_KEY
```

---


### **Step 2: Create Database and Import Sample Data**

1. **Download the `product.csv` file**  
   This file contains sample product data to import into your PostgreSQL database.

2. **Access your PostgreSQL Database**  
   Use a PostgreSQL client like **pgAdmin**, **psql**, or any SQL client of your choice to connect to your database.

3. **Run the SQL Commands from `query.sql`**  
   Ensure that the necessary tables (including the `products` table) are created. The `query.sql` file contains the required SQL commands to set up the database structure. Run it by executing the following command in your PostgreSQL client:

   ```bash
   psql -U your_username -d your_database -f /path/to/query.sql
   ```
4. **Import the `product.csv` File**  
    After running the `query.sql` file and ensuring the tables are set up, import the sample data from `product.csv` into the `products` table by running the following SQL command (replace `/path/to/product.csv` with the actual file path):

    ```sql
    \copy products(name, description, price, category, stock) FROM '/path/to/product.csv' DELIMITER ',' CSV HEADER;
    ```

    This will import the data into the `products` table.

5. **Verify Data Import**  
    To confirm the import was successful, run:

    ```sql
    SELECT * FROM products;
    ```

    This will display the list of products in the `products` table to ensure everything is set up correctly.

---

### **Step 4: Install Dependencies**

1. **Navigate to the Project Directory**  
   Open your terminal or command prompt and change the directory to where you downloaded or cloned the project.

   ```bash
   cd path/to/your/project

2. **Install the Required Packages**  
    Once you're in the project directory, run the following command to install all the necessary dependencies:
    ```bash
    npm install
    ```

---

### **Step 5: Run the Project**

1. **Start the Application**  
   Once you've installed all the dependencies, you can start the project using `nodemon`. If you don't have `nodemon` installed globally, you can install it by running the following command:

    ```bash
    npm install -g nodemon
    ```

2. **Run the Application**
After ensuring nodemon is installed, start the application with the following command:

    ```bash
    nodemon index.js
    ```

---

This will run the project on your localhost. By default, it will be available at http://localhost:3000, but you can configure the port in the .env file.
