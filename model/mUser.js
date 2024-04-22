// citation: https://cloud.google.com/nodejs/docs/reference/datastore/latest
// Imports the Google Cloud client library
import { Datastore } from '@google-cloud/datastore';
// Creates a client
const datastore = new Datastore();
// Creates a user
const USER = "User";

// A helper function that attempts to get the ID of an imput item
// and assign it to the new ID on the returned item
// A code snippet from CS493
function fromDatastore(item) {
  try {
      item.id = item[datastore.KEY].id;
      return item;
  } catch {
      return -1;
  }
}

export function getUser(user) {
  const query = datastore.createQuery(USER);

  return datastore.runQuery(query).then((users) => {
    // userCheck is an array that is populated with a JS object (a User entity), where the object matches
    // an existing User or no User, using the 'sub' property.
    const userCheck = users[0].map(fromDatastore).filter(filteredUser => filteredUser.user.sub === user.user.sub);
    if (userCheck.length === 0) {
      console.log("user does not exist. creating one now");
    } else {
      console.log("user exists. do not create one");
      }
    return userCheck;
  });
}

// https://auth0.com/docs/secure/tokens/json-web-tokens
export function postUser(user) {
  // The datastore key associated with a USER entity
  const key = datastore.key(USER);

  // Check if User already exists in the database
  // If User exists, return the User without saving in database
  return getUser(user).then((userCheck) => {

    if (userCheck.length === 0) {
      // Save the new user in datastore, and store in this var
      return datastore.save({ "key": key, "data": user }).then((res) => {
        //return { key, data: user }
        console.log("user.user = ", user.user);
        return user.user;
      });
    } else {
      console.log("userCheck[0].user = ", userCheck[0].user);
      return userCheck[0].user;
    }
  })


}