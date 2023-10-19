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

### Defining Your Config

Create a turbo-config.json

### Running Your API

To start your Turbo-API, include the following in your main application file:

    const { buildApp } = require('./hyperAPI')

    // Set up Firebase Admin/Auth (if using Firebase)
    admin.initializeApp()

    const app = buildApp()

    // Export the API
    exports.api = functions.https.onRequest(app)

Now your Turbo-API is up and running! You can access the `/get/:id` route for books you've defined in your controller.

## Customization

Turbo-API is highly customizable. You can extend and modify controllers, create your custom services, and change validation rules to match your application's unique requirements.

### Error Handling

Turbo-API provides a consistent way to handle errors, making it easy to return meaningful HTTP responses based on the type of error.

    const { ValidationError } = require('turbo-api');

    // Inside your controller
    if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message || 'Bad request' });
    }

## Extending Turbo-API

Turbo-API is designed to be extensible. You can add new services to the factory and create custom validation methods to meet your specific project needs. You can add or extend back-end services and controller actions.

More on this to come...

## License

Turbo-API is licensed under the ISC License.
