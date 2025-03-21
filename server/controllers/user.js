const bcrypt = require('bcryptjs');

module.exports = {
    register: async (req, res) => {
        // bring in our db
        const db = req.app.get('db');

        // receive the information to eventually add a new user
        const { username, password, profile_pic, admin} = req.body;
   
        try {
            const [existingUser] = await db.find_user_by_username(username)
    
            if (existingUser) {
                return res.status(409).send('User already exists')
            }
    
            // hash and salt the password
            const salt = bcrypt.genSaltSync(10);

            const hash = bcrypt.hashSync(password, salt)
            const [ newUser ] = await db.register_user(username, password, profile_pic,hash, admin);

            // create a session for the user using the db response
            req.session.user = newUser;

            // send a response that includes the user session info
            res.status(200).send(newUser);
    }
    catch(err) {
        console.log(err);
        return res.sendStatus(500);
    }
},
login: (req, res) => {
    // get db instance
    const db = req.app.get('db'); 

    // get necessary info from req.body
    const { email, password } = req.body;
    
    // check if that user exists, if they do NOT, reject request
    db.get_user_by_email(email)
        .then(([existingUser]) => {
            if (!existingUser) {
                return res.status(403).send('Incorrect email')
            }

            // compare the password from req.body with the stored hash that we just retrieved..if mismatch, reject
            const isAuthenticated = bcrypt.compareSync(password, existingUser.hash)

            if (!isAuthenticated) {
                return res.status(403).send('Incorrect password')
            }
            // set up our session and be sure to not include the hash in the session
            delete existingUser.hash;

            req.session.user = existingUser;

            // send the response and session to the front
            res.status(200).send(req.session.user)
        })
},
logout: (req, res) => {
    req.session.destroy();
    res.sendStatus(200);
},

getUser: (req, res) => {
    const { user } = req.session;
    if (user) {
      return res.status(200).send(user);
    } else {
      return res.sendStatus(404);
    }
}
}