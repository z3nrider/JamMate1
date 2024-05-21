const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getUserInfo, updateUserInfo, getUsers } = require('../model/mUser');
const { saveProfilePicture } = require('../model/storageService');
const { getPosts } = require('../model/mPost');
const { getAds } = require('../model/mAd');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to ensure the user is authenticated
function isAuthenticated(req, res, next) {
    if (!req.oidc.isAuthenticated()) {
        return res.redirect('/login');
    }
    next();
}

// Display the user's profile
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userEntity = await getUserInfo(req.oidc.user.sub);
        if (!userEntity) {
            return res.status(404).send('User not found');
        }
        const posts = await getPosts({userId: req.oidc.user.sub});
        const ads = await getAds();
        res.render('profilepage', {
            user: userEntity.user,
            posts: posts,
            ads: ads,
            loggedIn: req.oidc.isAuthenticated()
        });
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to update the user's bio information
router.post('/update-bio', isAuthenticated, async (req, res) => {
    const { nickname, description, skillLevel, location, instrument } = req.body;
    try {
        await updateUserInfo(req.oidc.user.sub, {
            nickname,
            description,
            skillLevel,
            location,
            instrument
        });
        res.redirect('/user');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle profile picture update
router.post('/update-profile-picture', upload.single('profilePicture'), isAuthenticated, async (req, res) => {
    try {
        const filePath = await saveProfilePicture(req.file);
        await updateUserInfo(req.oidc.user.sub, { profilePicture: filePath });
        res.json({ success: true, filePath: filePath });
    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

module.exports = router;



