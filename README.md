# Turbo-API

Turbo-API is a high-speed, feature-rich Node.js library that makes it a breeze to create custom APIs, perfect for both beginners and experienced developers. With Turbo-API, you can rapidly set up robust APIs with built-in validation, logging, and services for multiple data backends.

## Features

-   **Rapid API Development**: Turbo-API is designed to help you quickly set up APIs with minimal configuration, allowing you to focus on your application's core logic.

-   **Customizable**: While Turbo-API offers sensible defaults, you can easily customize and extend it to fit your specific project needs.

-   **Validation**: Built-in validation and error handling provide a safety net for your API routes, helping you catch and handle errors with ease.

-   **Service Agnostic**: Turbo-API is compatible with various data backends. You can seamlessly switch between services, extend existing ones, or create new services to connect to different back-end providers.

## Getting Started

### Installation

First, install Turbo-API in your Node.js project:

`npm install turbo-api`

### Creating a Controller

Turbo-API follows a controller-based architecture. Here's how you can create a basic controller for a book API:

```javascript
    const ControllerBase = require('hyperAPI/controllerBase');
    const { AuthError, NoContentError, stringType, numberType, validateData } = require('hyperAPI/validation');
    const { handleRoute } = require('hyperAPI/http');

    const BOOK_COLLECTION = 'Books';
    const AUTHOR_COLLECTION = 'Authors';
    const BOOK_PROPS = ['title', 'year', 'genre', 'isbn', 'author'];
    const BOOKAUTHOR_PROPS = ['book', 'author']

    const bookValidationRules = {
        title: {
            required: true,
            type: stringType,
            minLength: 2,
            maxLength: 100,
        },
        year: {
            required: true,
            type: numberType,
            minValue: 0,
            maxValue: new Date().getFullYear(),
        },
        genre: {
            required: false,
            type: stringType,
            values: ['history', 'horror', 'mystery', 'reference', 'self-help', ...],
        },
        isbn: {
            required: false,
            unique: true,
            type: stringType,
            minLength: 10,
            maxLength: 20,
        },
        author: {
            required: true,
            type: stringType,
            minLength: 2,
            maxLength: 100,
            reference: AUTHOR_COLLECTION, // Reference to the "Authors" collection
        },
    };
    const bookAuthorValidationRules = {
        uniquePropCombination: ['bookId', 'authorId'],
        bookId: { required: true, type: stringType, reference: BOOK_COLLECTION },
        authorId: { required: true, type: stringType, reference: AUTHOR_COLLECTION },
    }

    class BookController extends ControllerBase {
        constructor() {
            super(BOOK_COLLECTION, bookValidationRules, BOOK_PROPS);
        }

        configureRoutes() {
            this.router.post('/add', (req, res) => handleRoute(req, res, async (req) =>
                await this.createDocument(req.body, req.user)
            ));

            this.router.get('/get/:id', (req, res) => handleRoute(req, res, async (req) =>
                await this.getDocumentById(req.params.id, req.user, true)
            ));

            this.router.get('/getAll', (req, res) => handleRoute(req, res, async (req) =>
                await this.getAllDocuments(req.user)
            ));

            this.router.put('/update/:id', (req, res) => handleRoute(req, res, async (req) =>
                await this.updateDocument(req.params.id, req.body, req.user)
            ));

            this.router.delete('/delete/:id', (req, res) => handleRoute(req, res, async (req) =>
                await this.deleteDocument(req.params.id, req.user)
            ));

            this.router.put('/:bookId/author/:authorId', (req, res) => handleRoute(req, res, async (req) =>
                const user = req.user
                if (!user) throw new AuthError('User is not authenticated')

                // Create an entry in a book-author joining table
                const bookId = req.params.bookId
                const authorId = req.params.authorId
                const bookAuthor = { bookId, authorId }

                // Validate against the rules defined above
                validateData(bookAuthor, bookAuthorValidationRules, this.db, BOOKAUTHOR_COLLECTION)
                const linkResult = await this.db.createDocument(BOOKAUTHOR_COLLECTION, bookAuthor, user.uid)
                this.logger.info(`Topic ${topicId} linked to Spar ${sparId} by ${user.uid}`)
                return linkResult
            ));
        }

        async linkToAuthor(bookId, authorId, user) {
            if (!user) throw new AuthError('User is not authenticated');

            // Check if the book and author exist
            const book = await this.db.getDocumentById(BOOK_COLLECTION, bookId);
            if (!book) throw new NotFoundError(`Book with ID ${bookId} not found`);

            const author = await this.db.getDocumentById(AUTHOR_COLLECTION, authorId);
            if (!author) throw new NotFoundError(`Author with ID ${authorId} not found`);

            // Update the book's author property
            book.author = authorId;

            // Validate the updated book data
            validateData(book, bookValidationRules, this.db, BOOK_COLLECTION);

            // Update the book in the database
            const updatedBook = await this.db.updateDocument(BOOK_COLLECTION, bookId, book, user.uid);

            this.logger.info(`Book ${bookId} linked to Author ${authorId} by ${user.uid}`);

            return updatedBook;
        }
    }

    module.exports = {
        controller: BookController,
        BOOK_COLLECTION,
        AUTHOR_COLLECTION,
        BOOK_PROPS,
        bookValidationRules,
    };
```

### Defining Your Config

Create a turbo-config.json file in the root folder of your project. It specifies the data and logging services to use, as well as the mapping of controller names to their respective routes.

1. **Create the Configuration File**:

    If you don't have a `turbo-config.json` file in your project, create one in the root folder of your Turbo-API project. You can use the provided example as a starting point:

```javascript
    {
        "dataService": "firestore",
        "loggingService": "firestore",
        "controllers": {
            "bookController": "/books",
            "authorController": "/authors",
        }
    }
```

2. **Configure Data and Logging Services**:

"dataService": Specify the data service to use (e.g., "firestore"). Turbo-API is designed to support any number of back-end services. Firestore is the only back-end service set up by default, as of v1.0.1.

"loggingService": Define the logging service to use (e.g., "firestore"). Similar to the data service, Turbo-API allows for flexibility in selecting logging services.

3. **Map Controllers to Routes**:

In the "controllers" section, you map each controller name to its respective route. For example, "profileController": "/profile" associates the "profileController" with the "/profile" route. You can customize these routes to match your application's needs.

## Setting up Firebase in Your Consuming App

To use Firebase as your data service in your consuming app, you need to set up your Firebase credentials. The Turbo-API library allows you to configure Firebase credentials using environment variables. Follow these steps to set up Firebase in your consuming app:

1.  **Install the Firebase SDK**: If you haven't already, install the Firebase SDK in your project using npm or yarn.

        npm install firebase
        # OR
        yarn add firebase

2.  **Create a Firebase Project**:

If you don't have a Firebase project yet, create one on the Firebase Console.
Once your project is created, navigate to Project Settings to find your Firebase configuration.

3. **Set Up Environment Variables**:

In your consuming app, set up environment variables to store your Firebase configuration. You can use a library like dotenv to load these variables from a .env file.

Create a .env file in your project's root directory (if you don't have one already) and add the following environment variables, replacing the values with your Firebase configuration details:

    FIREBASE_TYPE=your-firebase-app-type
    FIREBASE_PROJECT_ID=your-project-id
    FIREBASE_PRIVATE_KEY_ID=your-private-key-id
    FIREBASE_PRIVATE_KEY=your-private-key
    FIREBASE_CLIENT_EMAIL=your-client-email
    FIREBASE_CLIENT_ID=your-client-id

These environment variables are not required, and have default values:

    FIREBASE_AUTH_URI=
    FIREBASE_TOKEN_URI=
    FIREBASE_AUTH_PROVIDER_CERT_URL=
    FIREBASE_CLIENT_CERT_URL=

You can find these configuration values in your Firebase project settings.

4. **Load Environment Variables**:

In your consuming app's entry point (e.g., index.js or app.js), make sure to load the environment variables from the .env file using dotenv. You can do this by adding the following code at the beginning of your entry point:

```javascript
    require('dotenv').config();
```

### Running Your API

To start your Turbo-API, include the following in your main application file:

```javascript
    const { buildApp } = require('./hyperAPI')

    // Set up Firebase Admin/Auth (if using Firebase)
    admin.initializeApp()

    const app = buildApp()

    // Export the API
    exports.api = functions.https.onRequest(app)
```

Now your Turbo-API is up and running! You can access the `/get/:id` route for books you've defined in your controller.

## Customization

Turbo-API is highly customizable. You can extend and modify controllers, create your custom services, and change validation rules to match your application's unique requirements.

### Error Handling

Turbo-API provides a consistent way to handle errors, making it easy to return meaningful HTTP responses based on the type of error.

```javascript
    const { ValidationError } = require('turbo-api');

    // Inside your controller
    if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message || 'Bad request' });
    }
```

## Extending Turbo-API

Turbo-API is designed to be extensible. You can add new services to the factory and create custom validation methods to meet your specific project needs. You can add or extend back-end services and controller actions.

More on this to come...

## License

Turbo-API is licensed under the ISC License.
