# 🛍️ Laioutr Shopware Integration

This repository contains the official Shopware 6 integration for the Laioutr frontend framework. This connector provides a comprehensive set of features to connect your Laioutr application with a Shopware backend, enabling full e-commerce functionality.

This connector provides a robust bridge to Shopware as it handles sessions, customer data, cart management, product retrieval, reviews, and more.

<hr />

### ✨ Features:

- 👤 Customer & Session Management

  - Anonymous Sessions: Track users and persist carts before they log in.
  - Login & Customer Sessions: Full support for registered customer authentication and session handling.

- 🛒 Cart Management

  - Get Current Cart: Retrieve the active shopping cart for the current session.
  - Add Item to Cart: Seamlessly add products and variants to the user's cart.

- 🗂️ Category & Navigation

  - Category List: Fetch a flat list of all available categories.
  - Category Tree: Retrieve a nested category structure by its alias (e.g., for building navigation menus).

- 📦 Products & Variants

  - Products by Category ID: Get a list of all products within a specific category using its ID.
  - Products by Category Slug: Get a list of all products within a specific category using its URL slug.
  - Get Product by Slug: Retrieve detailed information for a single product.
  - Product Variants: Fetch all available variants (e.g., size, color) for a product.
  - Canonical Categories: Identify the primary (canonical) category for a product, essential for SEO.
  - Product Search: Implement powerful, native Shopware search functionality across your product catalog.

- 🔍 Search & Reviews

  - Get Reviews: Retrieve all customer reviews for a specific product.
  - Create Reviews: Allow logged-in customers to submit new product reviews.

- ✉️ Miscellaneous
  - Newsletter Subscription: Enable users to subscribe to marketing newsletters.

<hr />

### 🚀 Installation

```bash
# Using npm
npm install @laioutr/app-shopware

# Using yarn
yarn add @laioutr/app-shopware
```

### ⚙️ Configuration & Usage

To get started, you need to configure the connector with your Shopware API credentials inside `nuxt.config.ts`. We recommend using environment variables:

```typescript
defineNuxtConfig({
  /* [...] */
  modules: ['@laioutr/app-shopware'],
  /* [...] */
  '@laioutr/app-shopware': {
    endpoint: import.meta.env.SHOPWARE_DEMO_ENDPOINT,
    accessToken: import.meta.env.SHOPWARE_DEMO_ACCESS_TOKEN,
    adminEndpoint: import.meta.env.SHOPWARE_DEMO_ADMIN_ENDPOINT,
    adminClientId: import.meta.env.SHOPWARE_DEMO_ADMIN_CLIENT_ID,
    adminClientSecret: import.meta.env.SHOPWARE_DEMO_ADMIN_CLIENT_SECRET,
  },
  /* [...] */
});
```

<hr />

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for bugs, feature requests, or improvements.

Fork the repository.

Create your feature branch (git checkout -b feature/AmazingFeature).

Commit your changes (git commit -m 'feat: Add some AmazingFeature').

Push to the branch (git push origin feature/AmazingFeature).

Open a Pull Request.

### 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
