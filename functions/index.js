const stripe = require('stripe')('sk_test_qnogXyb901rPSMe2oRbzKVa0004i1Yn4NO')
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// Add middleware to authenticate requests
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/CreateCard', (req, res) => {
    console.log(req.body)
    res.status(201).json(req.body)
    //toDev
})

exports.Express = functions.https.onRequest(app);

exports.getUserFromStripe = functions.firestore.document('Users/{userId}').onWrite(async (snap) => {
    if (!snap.after.data().Stripe) {
        stripe.customers.create({
            email: snap.after.data().email
        }, function (err, customer) {
            if (err) console.log(err)
            snap.after.ref.update({ Stripe: customer })
        })
    } else {
        stripe.customers.update(snap.after.data().Stripe.id, {
            email: snap.after.data().email
        }, function (err, customer) {
            if (err) console.log(err)
            snap.after.ref.update({ Stripe: customer })
        })
    }

})