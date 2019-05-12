const { MongoClient, ObjectId } = require('mongodb');
const url = "mongodb://localhost:27017/";

let instance;
function getDB() {
    return new Promise((res, rej) => {
        if (instance) {
            res(instance);
        } else {
            try {
                MongoClient.connect(
                    url, 
                    { 
                        useNewUrlParser: true,
                        reconnectTries: 100,
                        reconnectInterval: 5000
                    },
                    (err, db) => {
                        if (!err) {
                            console.log('Mongo is back');
                            instance = db;
                            res(db);
                        } else {
                            console.error(err);
                        }
                    }
                )
            } catch (error) {
                rej(error);
            }
        }
    })
}

function addStorage(title, description, count) {
    getDB()
    .then(client => {
        const db = client.db('library');
        db.collection("books").insertOne({ title, description, count }, (err, res) => {
            if (err) throw err;
            console.log(`Book ${title} added`);
        })
    })
    .catch(err => console.error(err));
}

function getBooks(page, pageSize) {
    return new Promise(async (res, rej) => {
        const client = await getDB();
        try {
            const db = client.db("library");
            const collection = db.collection("books");
            const query = collection.find();
            const total = await query.count();
            const cursor = page <= 1 ? query.limit(pageSize) : query.skip((page-1) * pageSize).limit(pageSize);
            const arr = await cursor.toArray();

            // get reservations
            const reservs = await reservedBooks(arr.map(b => b._id));
            const withReserv = arr.map(a => {
                const reserved = reservs.filter(r => String(r.book_id) === String(a._id)).length;
                return { ...a, reserved };
            })
            const data = {
                page,
                pageSize,
                total,
                result: withReserv
            }
            res(data);
        } catch (error) {
            rej(error);
        }
    })
}

function getBook(book_id) {
    return new Promise(async (res, rej) => {
        const client = await getDB();
        try {
            const db = client.db("library");
            const collection = db.collection("books");
            const book = await collection.findOne({ _id: ObjectId(book_id) });
            if (book) {
                res(book);
            } else {
                rej('book not found');
            }
        } catch (error) {
            rej(error);
        }
    })
}

function reserve(book_id, user_id, start_date, end_date) {
    return new Promise(async (res, rej) => {
        const client = await getDB();
        try {
            const collection = client.db("library").collection("reservation");
            const reservation = await reservedBooks([book_id]);
            if (reservation && reservation.length) {
                // query book
                const book = await getBook(book_id);
                // check storage
                if (Number(book.count) <= reservation.length) {
                    rej('Book out of stock');
                } else {
                    // book available, check if user already reserved before
                    const reserved = reservation.some(r => r.user_id === user_id);
                    if (!reserved) {
                        // not reserved yet, add doc
                        collection.insertOne({ book_id, user_id, start_date, end_date });
                        res(true);
                    } else {
                        rej(`user ${user_id} already reserved one book`);
                    }
                }
            } else {
                collection.insertOne({ book_id, user_id, start_date, end_date });
                res(true);
            }
        } catch (error) {
            rej(error);
        }
    })
}

function addUser(name, password) {
    return new Promise(async (res, rej) => {
        try {
            const client = await getDB();
            const db = client.db('library');
            const collection = db.collection("users");
            // check if already registered.
            const user = await collection.findOne({ name });
            console.log(user);
            if (user) {
                rej(`User ${name} already registered.`);
            } else {
                collection.insertOne({ name, password }, (err, _) => {
                    if (err) throw err;
                    res(true);
                })
            }
        } catch (error) {
            rej(error);
        }
    })
}

function reservedBooks(bookIds) {
    return new Promise(async (res, rej) => {
        const client = await getDB();
        try {
            const collection = client.db("library").collection("reservation");
            const reservations = await collection.find({ book_id: { $in: bookIds.map(id => String(id)) } }).toArray();
            if (!reservations) {
                // not reserved yet, add doc
                res([]);
            } else {
                res(reservations);
            }
        } catch (error) {
            rej(error);
        }
    })
}

function reservations(user_id) {
    return new Promise(async (res, rej) => {
        const client = await getDB();
        try {
            const collection = client.db("library").collection("reservation");
            const reservations = await collection.find({ user_id }).toArray();
            res(reservations || []);
        } catch (error) {
            rej(error);
        }
    })
}

function delAllReservations() {
    return new Promise(async (res, rej) => {
        const client = await getDB();
        try {
            const collection = client.db("library").collection("reservation");
            collection.deleteMany({});
            res(true);
        } catch (error) {
            rej(error);
        }
    })
}

function login(name, password) {
    return new Promise(async (res, rej) => {
        const client = await getDB();
        try {
            const collection = client.db('library').collection('users');
            const user = await collection.findOne({ name });
            if (!user) {
                rej(`User ${name} not exist.`);
            } else {
                if (user.password !== password) {
                    rej(`Incorrect password`);
                } else {
                    res(user);
                }
            }
        } catch (error) {
            rej(error);
        }
    })
}

function findUser({ name, _id }) {
    return new Promise(async (res, rej) => {
        const client = await getDB();
        try {
            const collection = client.db('library').collection('users');
            const query = {};
            name ? query.name = name : null;
            _id ? query._id = ObjectId(_id) : null;
            const user = await collection.findOne(query);
            res(user);
        } catch (error) {
            rej(error);
        }
    })
}

function stop() {
    return new Promise(async (res, rej) => {
        const client = await getDB();
        client.close();
    })
}

module.exports = { addStorage, getBooks, reserve, addUser, reservations, login, findUser, reservedBooks, delAllReservations, stop };