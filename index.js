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
            'http://localhost:5175'
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


//middlewares
const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log('token in the middleware', token);
    // no token available 
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
    })
}




async function run() {
    try {


        // auth related api

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log('user for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true });
        })


        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logging out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })




        // auth related api end



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

        // app.get('/requestedFood', async (req, res) => {
        //     try {
        //         console.log(req.query.email)
        //         const cursor = featuredFoodCollection.find({ foodStatus: "requested" });
        //         const result = await cursor.toArray();
        //         res.json(result);
        //     } catch (error) {
        //         console.error(error);
        //         res.status(500).json({ message: 'Internal server error' });
        //     }
        // })
        app.get('/requestedFood', verifyToken, async (req, res) => {
            try {
                const userEmail = req.user.email; // Extract user email from verified token
                if (req.user.email !== req.query.email) {
                    return res.status(403).send({ message: 'forbidden access' })
                }
                const cursor = featuredFoodCollection.find({
                    foodStatus: "requested",
                    userEmail // Show only requested items of the logged-in user
                });
                const result = await cursor.toArray();
                res.json(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });


        app.get('/manageFood', verifyToken, async (req, res) => {
            try {
                const donorEmail = req.query.email; // Extract donor email from query parameters
                if (!donorEmail || donorEmail !== req.user.email) {
                    return res.status(403).json({ message: 'Forbidden access' });
                }
                const cursor = featuredFoodCollection.find({ 'donator.email': donorEmail });
                const result = await cursor.toArray();
                res.json(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });



        app.get('/updateFood/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) };
            const result = await featuredFoodCollection.findOne(query);
            res.send(result);

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
                    userEmail: pop.userEmail,
                    userName: pop.userName


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

        app.put('/manageUpdateFood/:id', verifyToken, async (req, res) => {
            const id = req.params.id;

            console.log(req.body);
            const userEmailFromBody = req.body.UserEmail;
            const userEmailFromToken = req.user.email;


            if (userEmailFromToken !== userEmailFromBody) {
                return res.status(403).json({ message: 'Forbidden access' });
            }
            const filter = { _id: new ObjectId(id) };
            const pop = req.body;

            const updatedFood = {
                $set: {
                    foodImage: pop.foodImage,
                    foodName: pop.foodName,
                    foodQuantity: pop.foodQuantity,
                    pickupLocation: pop.pickupLocation,
                    expiredDateTime: pop.expiredDateTime,
                    additionalNotes: pop.additionalNotes,
                    foodStatus: pop.foodStatus,


                }
            };
            try {
                const result = await featuredFoodCollection.updateOne(filter, updatedFood);
                res.json(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        })

        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await featuredFoodCollection.deleteOne(query);
            res.send(result);
        })





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