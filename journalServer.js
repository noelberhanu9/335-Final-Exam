const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') });

const { MongoClient, ServerApiVersion } = require("mongodb");
const axios = require("axios");

const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.9p5xm.mongodb.net/JournalDB?retryWrites=true&w=majority`;
const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };

const app = express();
const portNumber = process.argv[2];
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs");


app.get("/", async (request, response) => {
    try {
        const apiQuote = await axios.get("https://zenquotes.io/api/random");
        
        const quoteData = apiQuote.data[0];
        const quote = `${quoteData.q} — ${quoteData.a}`;
        
        response.render("home", { quote });
    } catch (e) {
        console.error(e);
        response.render("home", { quote: "Stay positive!" }); 
    }
});


app.post("/submit", async (request, response) => {
    let client;
    try {
        client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
        await client.connect();

        const journalEntry = {
            date: request.body.date,
            time: request.body.time,
            title: request.body.title,
            entry: request.body.entry,
        };

        await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .insertOne(journalEntry);

        response.send(
            `<h1>Entry Submitted Successfully!</h1>
            <a href="/">HOME</a>`
        );
    } catch (e) {
        console.error(e);
    } finally {
        if (client) {
            await client.close();
        }
    }
});


app.get("/view", (request, response) => {
    response.render("viewEntries");
});

app.post("/view", async (request, response) => {
    const { date } = request.body;
    let client;
    try {
        client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
        await client.connect();

        const filter = date ? { date } : {};
        const entries = await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .find(filter).toArray();

        if (entries.length > 0) {
            let result = `<h1>Your Journal Entries</h1><ul>`;
            entries.forEach(entry => {
                result += `
                    <li>
                        <strong>${entry.date} ${entry.time}</strong><br>
                        Title: ${entry.title} <br>
                        Entry: ${entry.entry}
                    </li>`;
            });
            result += `</ul>
                <a href="/">HOME</a>`;
            response.send(result);
        } else {
            response.send(`<h1>No Entries Found</h1>
                    <a href="/">HOME</a>`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        if (client) {
            await client.close();
        }
    }
});

process.stdin.on("data", function (dataInput) {
    
    if (dataInput.toString().trim() === "stop") {
        console.log("Shutting down the server");
        process.exit(0); 
    } else {
        console.log(`Invalid input: ${dataInput.toString().trim()}`);
    }
    process.stdout.write("Stop to shutdown the server: ");
});


app.listen(portNumber);
console.log(`Web server started and running at http://localhost:${portNumber}`);
process.stdout.write("Stop to shutdown the server: ");
