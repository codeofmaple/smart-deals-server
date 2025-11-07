require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const admin = require("firebase-admin");

// index.js
const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



const verifyFirebaseToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        console.log('No Authorization header');
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    const token = authorization.split(' ')[1];
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        console.log('decoded token:', decoded);
        req.token_email = decoded.email;
        next();

    } catch (error) {
        console.error('verifyIdToken error:', error);
        return res.status(401).send({ message: 'Unauthorized access' });
    }
};

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.dwmxail.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// api
app.get('/', (req, res) => {
    res.send("smart server is running")
})

async function run() {
    try {
        await client.connect();
        const db = client.db("smart_db")
        const myProColl = db.collection("products")
        const bidsColl = db.collection("bids")

        //crud - create | read | update | delate---------------------
        // product collection apis __________________________________
        // create | post product
        app.post('/products', verifyFirebaseToken, async (req, res) => {
            const newProduct = req.body;
            const result = await myProColl.insertOne(newProduct);
            res.send(result);
        })

        // read | get all products
        app.get('/products', async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.email = email
            }

            const cursor = myProColl.find(query)
            const result = await cursor.toArray();
            res.send(result)
        })
        // get recent 6 products
        app.get('/products/recent', async (req, res) => {
            const projectFields = { _id: 1, title: 1, image: 1, price_min: 1, price_max: 1 }
            const cursor = myProColl.find({}).sort({ created_at: 1 }).limit(6).project(projectFields)
            const result = await cursor.toArray();
            res.send(result)
        })

        // get products by person email
        app.get('/products/your-products', verifyFirebaseToken, async (req, res) => {
            const email = req.query.email
            query = {}
            if (email) {
                query.email = email
                if (email !== req.token_email) {
                    return res.status(403).send({ massage: 'unauthorized access' })
                }
            }

            const cursor = myProColl.find(query);
            const result = await cursor.toArray()
            res.send(result)
        })

        // read | get one product with id
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await myProColl.findOne(query)
            res.send(result)
        })

        // update / patch
        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const updateProduct = req.body;
            const query = { _id: new ObjectId(id) };
            const update = {
                $set: {
                    name: updateProduct.name,
                    age: updateProduct.age
                }
            }
            const result = myProColl.updateOne(query, update)
            res.send(result)
        })

        // delete
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await myProColl.deleteOne(query);
            res.send(result);
        })

        // bids collection apis __________________________________
        //post bids
        app.post('/bids', async (req, res) => {
            const newBids = req.body
            const result = await bidsColl.insertOne(newBids)
            res.send(result)
        })

        // get all bids | sort by price up to down
        app.get('/bids', async (req, res) => {
            const cursor = bidsColl.find().sort({ bid_price: -1 });
            const result = await cursor.toArray()
            res.send(result)
        })

        // get bids by person | email
        app.get('/bids/your-bids', verifyFirebaseToken, async (req, res) => {
            const email = req.query.buyer_email
            query = {}
            if (email) {
                query.buyer_email = email
                if (email !== req.token_email) {
                    return res.status(403).send({ massage: 'unauthorized access' })
                }
            }

            const cursor = bidsColl.find(query);
            const result = await cursor.toArray()
            res.send(result)
        })

        // get one bid by id
        app.get('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bidsColl.findOne(query)
            res.send(result)
        })

        // patch | update bids by id
        app.patch('/bids/:id', async (req, res) => {
            const id = req.params.id;
            const updateBid = req.body;
            const updatedDoc = { $set: updateBid };
            const query = { _id: new ObjectId(id) };
            const result = await bidsColl.updateOne(query, updatedDoc)
            res.send(result);
        })

        // delate bids
        app.delete('/bids/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bidsColl.deleteOne(query)
            res.send(result)
        })
        // _______________
        // ping to console
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {

    }
}

run().catch(console.dir)

// connect to PORT
// app.listen(PORT, () => {
//     console.log(`smart server is running on PORT: ${PORT}`)
// })

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// 2nd method to connect to mongodb
// client.connect().then(() => {
//     app.listen(PORT, () => {
//         console.log(`smart server is running now now now on PORT: ${PORT}`)
//     })
// }).catch(console.dir) 