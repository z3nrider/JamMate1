import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer'; // Import Multer
import path from 'path';
import { fileURLToPath } from 'url';
import { auth } from 'express-openid-connect';
import session from 'express-session';
import { Datastore } from '@google-cloud/datastore'; // Assuming use of Google Cloud Datastore

// Configure Datastore
const datastore = new Datastore({
    projectId: 'jammate-cs467', // Replace with your actual project ID
});

const POST_KIND = 'Post'; // Define a kind for the Datastore entries

import { postUser } from './model/mUser.js';
import { getSecret, getConfig } from './state.js';
import { getPosts, getPost, searchPosts, createPost, deletePost } from './model/mPost.js';

const app = express();
const login = express.Router();
const upload = multer({ dest: 'uploads/' }); // Configure multer with a files destination

const PORT = process.env.PORT || 9001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const secret = getSecret(10);
const config = getConfig(secret);

login.use(bodyParser.json());
login.use('/login', login); // req.isAuthenticated is provided from the auth router

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(auth(config));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files from uploads directory

// Stores browser session
app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: true
}));

app.post('/create-post', upload.single('media'), async (req, res) => {
    if (!req.oidc.isAuthenticated()) {
        return res.status(401).json({error: 'Not authenticated'});
    }
    const content = req.body.content;
    const file = req.file;  // Multer processes the file upload
    const userId = req.oidc.user.sub;
    const nickname = req.oidc.user.nickname;
    try {
        const post = await createPost(userId, nickname, content, file);
        res.json({
            ...post,
            message: 'Post created successfully'
        });
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).send({error: 'Failed to create post'});
    }
});

app.delete('/delete-post/:postId', async (req, res) => {
    if (!req.oidc.isAuthenticated()) {
        return res.status(401).send('Not authenticated');
    }
    const postId = req.params.postId;
    const userId = req.oidc.user.sub; // User ID of the currently logged-in user

    const postKey = datastore.key([POST_KIND, parseInt(postId)]);
    try {
        const [post] = await datastore.get(postKey);
        if (!post) {
            return res.status(404).send('Post not found');
        }
        // Check if the logged-in user is the owner of the post
        if (post.userId !== userId) {
            return res.status(403).send('Unauthorized to delete this post');
        }
        await datastore.delete(postKey);
        res.status(200).send({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route handlers
app.get('/', (req, res) => {
    handleAuthenticationFlow(req, res, "homepage")
    handleAuthenticationFlow(req, res, "homepage")
});
app.get('/profile', (req, res) => {
    handleAuthenticationFlow(req, res, "profilepage")
});


/**
 * Handles authentication when trying to access webpages
 *
 * @param {*} req - holds user object and id
 * @param {*} res
 * @param {*} destination - Where we want to send user upon authentication.
 */
async function handleAuthenticationFlow(req, res, destination) {
    // Determine if user is logged in
    let user;
    let posts;
    let userID;
    if (req.oidc.isAuthenticated()) {
        user = { "user": req.oidc.user, "jwt": req.oidc.idToken, "loggedIn": true };
        userID = req.oidc.user.sub;
    } else {
        user = { "user": req.oidc.user, "jwt": req.oidc.idToken,  "loggedIn": false };
    }

    // Gather the posts for the appropriate page.
    if (destination === "profilepage" && user.loggedIn === true) {
        // Fetch only user's posts for the profile page
        posts = await getPosts(userID);
    } else if (destination === "searchpage") {             // Fetch search posts
        posts = await searchPosts();
    } else if (destination === "postpage") {        // Fetch the individual post
        posts = await getPost();
    } else {
        posts = await getPosts();                   // Fetch all posts for other pages like the homepage
    }

    // Render the destination page and be logged in.
    if (user.loggedIn === true) {
        postUser(user)
        .then(result => {
            res.render(destination, { posts: posts, user: result, loggedIn: true });
        });
    } else {     // User is not logged in so redirect home with undefined data and false login status
    if (destination === "profilepage") {
        res.render('homepage', {posts: posts, user: user, loggedIn: false});
    } else {
        res.render(destination, { posts: posts, user: user, loggedIn: false });
    }
}};

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});

