const stripe = require('stripe')('sk_test_qnogXyb901rPSMe2oRbzKVa0004i1Yn4NO')
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const admin = require('firebase-admin');
admin.initializeApp()
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

app.post('/PlaceOrder', (req, res) => {
    // res.status(201).json(req.body)
    admin.auth().verifyIdToken(req.body.userTk)
        .then((decodedToken) => {
            admin.firestore().collection('Users').doc(decodedToken.uid).get().then((doc) => {

                stripe.charges.create({
                    amount: parseInt(parseFloat(req.body.payload.Total) * 100),
                    currency: "usd",
                    customer: doc.data().Stripe.id,
                    source: req.body.payload.Source.id, // obtained with Stripe.js
                }, function (err, charge) {
                    if (err) console.log(err)
                    else {
                        var saveObject = Object.assign(req.body.payload, charge)
                        admin.firestore().collection('Charges').doc(saveObject.id).set(saveObject).catch((err) => {
                            if (err) console.log(err)
                        }).then(() => {
                            res.status(201).json('success')
                            saveObject.List.map(item => {
                                admin.firestore().collection('Stock').doc(item.id).update({
                                    sold: admin.firestore.FieldValue.increment(item.amount)
                                })
                                admin.firestore().collection('Users').doc(decodedToken.uid).collection('Cart').doc(item.cartId).delete()
                            })
                        })

                    }
                })
            }).catch((error) => {
                console.log(error)
            });
        }).catch((error) => {
            console.log(error)
        });
})

app.post('/CreateCard', (req, res) => {
    // res.status(201).json(req.body)
    admin.auth().verifyIdToken(req.body.userTk)
        .then((decodedToken) => {
            admin.firestore().collection('Users').doc(decodedToken.uid).get().then((doc) => {
                stripe.customers.createSource(doc.data().Stripe.id, {
                    source: req.body.cardTk.id,
                }, (err) => {
                    if (err) console.log(err)
                    else stripe.customers.update(doc.data().Stripe.id, {
                        email: doc.data().email
                    }, function (err, customer) {
                        if (err) console.log(err)
                        else
                            admin.firestore().collection('Users').doc(decodedToken.uid).update({
                                Stripe: customer
                            }).then(() => {
                                res.status(201).json('Added')
                            }).catch((error) => {
                                if (error) res.status(201).json(error)
                            })
                    })

                })
            }).catch((error) => {
                console.log(error)
            });
        }).catch((error) => {
            console.log(error)
        });
})

app.post('/ChangeDefaultCard', (req, res) => {
    admin.auth().verifyIdToken(req.body.userTk)
        .then((decodedToken) => {
            admin.firestore().collection('Users').doc(decodedToken.uid).get().then((doc) => {
                stripe.customers.update(doc.data().Stripe.id, {
                    default_source: req.body.cardTk.id,
                }, (err) => {
                    if (err) {
                        res.status(201).json(err)
                        console.log(err)
                    } else
                        stripe.customers.update(doc.data().Stripe.id, {
                            email: doc.data().email
                        }, function (err, customer) {
                            if (err) console.log(err)
                            else
                                admin.firestore().collection('Users').doc(decodedToken.uid).update({
                                    Stripe: customer
                                }).then(() => {
                                    res.status(201).json('Changed')
                                }).catch((error) => {
                                    if (error) res.status(201).json(error)
                                })
                        })

                })
            }).catch((error) => {
                if (error) {
                    res.status(201).json(error)
                    console.log(error)
                }
            });
        }).catch((error) => {
            if (error) {
                res.status(201).json(error)
                console.log(error)
            }
        });
})

app.post('/DeleteCard', (req, res) => {
    admin.auth().verifyIdToken(req.body.userTk)
        .then((decodedToken) => {
            admin.firestore().collection('Users').doc(decodedToken.uid).get().then((doc) => {
                stripe.customers.deleteSource(doc.data().Stripe.id, req.body.cardTk.id, (err) => {
                    if (err) {
                        res.status(201).json(err)
                        console.log(err)
                    } else
                        stripe.customers.update(doc.data().Stripe.id, {
                            email: doc.data().email
                        }, function (err, customer) {
                            if (err) console.log(err)
                            else
                                admin.firestore().collection('Users').doc(decodedToken.uid).update({
                                    Stripe: customer
                                }).then(() => {
                                    res.status(201).json('Deleted')
                                }).catch((error) => {
                                    if (error) res.status(201).json(error)
                                })
                        })

                })
            }).catch((error) => {
                if (error) {
                    res.status(201).json(error)
                    console.log(error)
                }
            });
        }).catch((error) => {
            if (error) {
                res.status(201).json(error)
                console.log(error)
            }
        });
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