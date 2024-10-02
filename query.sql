------------------------------- PRODUCTS TABLE -------------------------------

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    max_price DECIMAL(10, 2) NOT NULL, -- New column
    price DECIMAL(10, 2) NOT NULL,
    offer_percent INTEGER NOT NULL,
    description TEXT,
    image_url TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);







------------------------------- USER TABLE -------------------------------

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


------------------------------- CART TABLE -------------------------------

CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE
);









INSERT INTO products (name, max_price, price, offer_percent, description, image_url, category, created_at)
VALUES
('Realme buds Air 6', 5999.00, 2799.00, 53, 'High-quality wireless headphones with active noise cancellation.', 'https://rukminim2.flixcart.com/image/612/612/xif0q/headphone/t/n/x/buds-air-6-realme-original-imah2hygm9gasqft.jpeg?q=70', 'electronics', CURRENT_TIMESTAMP);

('boAt Rockerz', 999.00, 499.00, 53, 'High-quality wireless headphones with active noise cancellation.', 'https://rukminim2.flixcart.com/image/612/612/xif0q/headphone/r/r/4/-original-imaguggqedr3ypyx.jpeg?q=70', 'electronics', CURRENT_TIMESTAMP);

('realme P1 5G', 20999.00, 13999.00, 33, 'Realme India.', 'https://rukminim2.flixcart.com/image/312/312/xif0q/mobile/y/9/0/-original-imahyuhfg2z4fvyh.jpeg?q=70', 'electronics', CURRENT_TIMESTAMP);

('Mi Smart Band 5 ', 2999.00, 2249.00, 25, 'Mi Band.', 'https://rukminim2.flixcart.com/image/312/312/xif0q/smart-band-tag/0/x/g/amoled-no-regular-14-yes-yes-xmshh10hm-android-ios-mi-yes-original-imah4vdfss9byayg.jpeg?q=70', 'electronics', CURRENT_TIMESTAMP);

('SONY Alpha ZV-E10L Mirrorless Camera ', 69999.00, 61489.00, 12, 'Best Camera.', 'https://rukminim2.flixcart.com/image/312/312/xif0q/dslr-camera/c/g/k/-original-imah4svgthuqdzef.jpeg?q=70', 'electronics', CURRENT_TIMESTAMP);

('Realme buds T110', 2999.00, 1099.00, 63, 'High-quality wireless headphones with env noise cancellation.', 'https://rukminim2.flixcart.com/image/612/612/xif0q/headphone/a/5/0/-original-imahy3uqdmgx6qey.jpeg?q=70', 'electronics', CURRENT_TIMESTAMP);

('Apple iPhone 16', 99900.00, 79900.00, 20, 'No. 1 mobile brand.', 'https://rukminim2.flixcart.com/image/312/312/xif0q/mobile/8/w/5/-original-imah4jyfwr3bfjbg.jpeg?q=70', 'electronics', CURRENT_TIMESTAMP);

('JBL Go', 2999.00, 1299.00, 56, 'Best Speaker.', 'https://rukminim2.flixcart.com/image/612/612/l27wtjk0/speaker/i/4/e/-original-imagdhhg2f7zjbt7.jpeg?q=70', 'electronics', CURRENT_TIMESTAMP);

('Hp Smart Tank', 16937.00, 11999.00, 29, 'Best Printer.', 'https://rukminim2.flixcart.com/image/612/612/xif0q/printer/m/l/k/smart-all-in-one-589-hp-original-imah52eqhagzgfgq.jpeg?q=70', 'electronics', CURRENT_TIMESTAMP);

('ZEBRONICS PIXAPLAY 22', 9499.00, 37999.00, 75, 'No. 1 Projector.', 'https://rukminim2.flixcart.com/image/612/612/xif0q/projector/k/f/0/zeb-pixaplay-22-green-16-zeb-pixaplay-22-green-led-zebronics-original-imagpqgasyrg2gzv.jpeg?q=70', 'electronics', CURRENT_TIMESTAMP);

('CAMPUS', 499.00, 399.00, 10, 'High-quality wireless headphones with env noise cancellation.', 'https://rukminim2.flixcart.com/image/612/612/xif0q/shoe/q/r/j/-original-imagzjg25cg9wsrj.jpeg?q=70', 'footware', CURRENT_TIMESTAMP);

-- Insert items for user with ID 1
INSERT INTO cart (product_id, user_id) VALUES
(1, 1),  -- Product 1 for User 1
(2, 1),  -- Product 2 for User 1
(3, 1),  -- Product 3 for User 1
(4, 1),  -- Product 4 for User 1
(5, 1);  -- Product 5 for User 1

-- Insert items for user with ID 2
INSERT INTO cart (product_id, user_id) VALUES
(1, 2),  -- Product 1 for User 2
(2, 2),  -- Product 2 for User 2
(3, 2),  -- Product 3 for User 2
(6, 2),  -- Product 6 for User 2
(7, 2);  -- Product 7 for User 2

