const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

// middleware

app.use(cors(
    {
        origin: [
            'http://localhost:5174'
        ],
        credentials: true
    }
))

app.use(express.json());
app.use(cookieParser());








const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iz3dvmk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {



        const featuredFoodCollection = client.db('featured').collection('food');
        app.get('/featuredFood', async (req, res) => {
            try {
                const cursor = featuredFoodCollection.find({ foodStatus: "available" });
                const result = await cursor.toArray();
                res.json(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        })

        app.get('/featuredFood/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await featuredFoodCollection.findOne(query);
            res.send(result);
        })

        app.get('/requestedFood', async (req, res) => {
            try {
                const cursor = featuredFoodCollection.find({ foodStatus: "requested" });
                const result = await cursor.toArray();
                res.json(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        })

        app.post('/addedFood', async (req, res) => {
            try {
                const newFood = req.body;
                console.log(newFood);
                const result = await featuredFoodCollection.insertOne(newFood);
                res.json(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        })

        app.put('/requestFood/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const pop = req.body;
            const updateDoc = {
                $set: {
                    foodStatus: "requested",
                    requestDate: pop.requestDate,
                    additionalNotes: pop.additionalNotes,
                    

                }
            };

            try {
                const result = await featuredFoodCollection.updateOne(filter, updateDoc);
                res.json(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });





        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);







app.get('/', (req, res) => {
    res.send('The  food sharing server is running')
})
app.listen(port, () => {
    console.log(`The server is running on port ${port}`);
})