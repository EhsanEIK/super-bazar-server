const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

require('dotenv').config();

app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rwmjrnt.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const productsCollection = client.db('superBazarDB').collection('products');
        const employeesCollection = client.db('superBazarDB').collection('employees');
        const ordersCollection = client.db('superBazarDB').collection('orders');

        // JWT
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
            res.send(JSON.stringify(token))
        })

        // products
        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const query = {};
            const cursor = productsCollection.find(query);
            const products = await cursor.skip(page * size).limit(size).toArray();
            const count = await productsCollection.estimatedDocumentCount();
            res.send({ count, products });
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.send(product);
        })

        // employee
        app.get('/employees', verifyJWT, async (req, res) => {
            if (req.decoded.currentUserEmail !== req.query.email) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const query = {};
            const cursor = employeesCollection.find(query);
            const employees = await cursor.toArray();
            res.send(employees);
        })

        app.get('/employees/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const employee = await employeesCollection.findOne(query);
            res.send(employee);
        })

        app.post('/employees', verifyJWT, async (req, res) => {
            const employee = req.body;
            const result = await employeesCollection.insertOne(employee);
            res.send(result);
        })

        app.put('/employees/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const employee = req.body;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateEmployee = {
                $set: {
                    name: employee.name,
                    position: employee.position,
                }
            }
            const result = await employeesCollection.updateOne(query, updateEmployee, options);
            res.send(result);
        })

        app.delete('/employees/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await employeesCollection.deleteOne(query);
            res.send(result);
        })

        // orders
        app.get('/orders', verifyJWT, async (req, res) => {
            if (req.decoded.currentUserEmail !== req.query.email) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            let query = {};
            if (req.query.email) {
                query = { email: req.query.email }
            }
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        })

        app.post('/orders', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        })

        app.delete('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })

    }
    finally { }
}
run().catch(error => console.error(error));


app.get('/', (req, res) => {
    res.send('super bazar server is running');
})

app.listen(port, () => {
    console.log('server is running on port:', port);
})