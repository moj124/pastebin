import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

// Get all posts from database

app.get("/pastes", async (req, res) => {
  const dbres = await client.query('select * from categories');
  res.send(dbres.rows)
});

// Add a new post to the database

app.post("/pastes", async (req, res) => {
  const { title, message, expiration } = req.body;
  console.log(title,message)
  if (typeof message === "string") {

    const text =
    "INSERT INTO categories(context,title,expiration_date) VALUES($1,$2,$3) RETURNING *";
    const values = [message,title,expiration];

    const response = await client.query(text, values);

    res.status(201).json({
      status: "success",
    });

  } else {
    res.status(400).json({
      status: "fail",
    });
  
  }
});

// Update a post from the database

app.put("/pastes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title,context } = req.body;
    const updatePost = await client.query(
      "UPDATE categories SET context = $1, title = $2 WHERE id = $3",
      [context,title, id]
    );

    res.json("Post was updated!");
  } catch (err) {
    console.error(err.message);
  }
});

// Get a post specified by id

app.get("/pastes/:id", async (req, res) =>{
  const {id} = req.params;
  const dbres = await client.query('select * from categories where id = $1',[id]);
  res.send(dbres.rows)
});

// Delete a post from the database

app.delete("/pastes/:id", async (req,res) =>{
  try {
    const { id } = req.params;
    const deleteTodo = await client.query("DELETE FROM categories WHERE id = $1", [
      id
    ]);
    res.json("Post was deleted!");
  } catch (err) {
    console.log(err.message);
  }
});


//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
